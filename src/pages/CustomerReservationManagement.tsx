import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Reservation, RestaurantSettings, Table, Area, DEFAULT_RESTAURANT_ID } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { useTenantSafe } from '../hooks/useTenant';
import { formatDisplayTime, cn } from '../lib/utils';
import { format, parseISO, isBefore, startOfDay, addDays, isSameDay } from 'date-fns';
import { calculateAvailableTimeSlots, findBestTableForBooking } from '../features/reservations/reservationAvailability';
import { DEFAULT_TABLES } from '../hooks/useTables';
import { getDefaultRestaurantData } from '../services/tenantService';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  AlertTriangle, 
  Edit3, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  ArrowLeft, 
  Copy, 
  Check, 
  Utensils, 
  FileText, 
  ChevronRight, 
  Info 
} from 'lucide-react';
import { sendCancellationEmail, sendUpdateEmail } from '../services/email/emailService';
import toast from 'react-hot-toast';

interface Props {
  initialMode?: 'view' | 'cancel' | 'modify';
}

const CANCELLATION_REASONS_EN = [
  'Change of plans / Schedule conflict',
  'Illness or medical emergency',
  'Found alternative restaurant',
  'Party size changed significantly',
  'Travel or weather disruption',
  'Other reasons'
];

const CANCELLATION_REASONS_PT = [
  'Alteração de planos / Conflito de agenda',
  'Doença ou emergência médica',
  'Opção por outro restaurante',
  'Alteração significativa no número de pessoas',
  'Problemas de transporte ou meteorologia',
  'Outro motivo'
];

export default function CustomerReservationManagement({ initialMode = 'view' }: Props) {
  const { id, slug } = useParams<{ id: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === 'pt';
  const { settings: globalSettings } = useSettings();
  const tenant = useTenantSafe();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isModifyParam = searchParams.get('mode') === 'modify' || searchParams.get('action') === 'modify';
  const isModifyPath = location.pathname.endsWith('/modify') || location.pathname.includes('/modify/');
  const isCancelPath = location.pathname.endsWith('/cancel') || location.pathname.startsWith('/cancel');

  const isCancelRoute = initialMode === 'cancel' || isCancelPath;
  const isModifyRoute = initialMode === 'modify' || isModifyPath || isModifyParam;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [restaurantData, setRestaurantData] = useState<Partial<RestaurantSettings> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Management Mode
  const [activeModal, setActiveModal] = useState<'none' | 'modify' | 'cancel'>(
    isCancelRoute ? 'cancel' : isModifyRoute ? 'modify' : 'none'
  );

  useEffect(() => {
    if (isModifyRoute) {
      setActiveModal('modify');
    } else if (isCancelRoute) {
      setActiveModal('cancel');
    }
  }, [isModifyRoute, isCancelRoute]);

  // Modification Form State
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editGuests, setEditGuests] = useState(2);
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingModify, setIsSubmittingModify] = useState(false);
  const [modifyStep, setModifyStep] = useState<'form' | 'confirm' | 'success'>('form');

  // Cancellation Form State
  const [cancelReasonCategory, setCancelReasonCategory] = useState(isPt ? CANCELLATION_REASONS_PT[0] : CANCELLATION_REASONS_EN[0]);
  const [cancelReasonNote, setCancelReasonNote] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Available Time Slots and Availability State
  const [tables, setTables] = useState<Table[]>(DEFAULT_TABLES);
  const [areas, setAreas] = useState<Area[]>([]);
  const [dateReservations, setDateReservations] = useState<Reservation[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [slotsBySession, setSlotsBySession] = useState<{ lunch: string[]; dinner: string[]; general: string[] }>({
    lunch: [],
    dinner: [],
    general: []
  });
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Fetch Reservation
  useEffect(() => {
    async function loadReservation() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const cleanId = id.trim();
        let foundRes: Reservation | null = null;

        // 1. Try by document ID
        try {
          const docRef = doc(db, 'reservations', cleanId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            foundRes = { id: snap.id, ...snap.data() } as Reservation;
          }
        } catch (e) {
          // continue to lookup by bookingNumber
        }

        // 2. Try by bookingNumber if not found by doc id (try string and number)
        if (!foundRes) {
          const numOnly = cleanId.replace(/^#/, '');
          let q = query(collection(db, 'reservations'), where('bookingNumber', '==', numOnly));
          let snap = await getDocs(q);
          if (snap.empty && !isNaN(Number(numOnly))) {
            q = query(collection(db, 'reservations'), where('bookingNumber', '==', Number(numOnly)));
            snap = await getDocs(q);
          }
          if (!snap.empty) {
            const first = snap.docs[0];
            foundRes = { id: first.id, ...first.data() } as Reservation;
          }
        }

        if (foundRes) {
          setReservation(foundRes);
          setEditDate(foundRes.date);
          setEditTime(foundRes.time);
          setEditGuests(foundRes.guests);
          setEditNotes(foundRes.notes || '');

          // Fetch restaurant info for this reservation
          const targetRestId = foundRes.restaurantId || slug || tenant?.tenant?.id || tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID;
          try {
            // Try settings collection with fallbacks
            let sSnap = await getDoc(doc(db, 'settings', targetRestId));
            if (!sSnap.exists() && targetRestId !== 'main') {
              sSnap = await getDoc(doc(db, 'settings', 'main'));
            }
            if (!sSnap.exists() && targetRestId !== DEFAULT_RESTAURANT_ID) {
              sSnap = await getDoc(doc(db, 'settings', DEFAULT_RESTAURANT_ID));
            }

            if (sSnap.exists()) {
              setRestaurantData(sSnap.data() as RestaurantSettings);
            } else {
              // Try restaurants collection
              let rSnap = await getDoc(doc(db, 'restaurants', targetRestId));
              if (!rSnap.exists() && targetRestId !== DEFAULT_RESTAURANT_ID) {
                rSnap = await getDoc(doc(db, 'restaurants', DEFAULT_RESTAURANT_ID));
              }
              if (rSnap.exists()) {
                setRestaurantData(rSnap.data() as RestaurantSettings);
              }
            }
          } catch (restErr) {
            console.warn('[CustomerManagement] Failed fetching restaurant info:', restErr);
          }
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('[CustomerManagement] Error loading reservation:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [id, slug, tenant?.targetRestaurantId, tenant?.tenant?.id]);

  // Combined settings
  const activeSettings = useMemo(() => {
    const defaultData = getDefaultRestaurantData();
    const resolvedHours = restaurantData?.openingHours || globalSettings?.openingHours || defaultData.openingHours;
    return {
      ...defaultData,
      ...globalSettings,
      ...restaurantData,
      openingHours: resolvedHours
    } as RestaurantSettings;
  }, [globalSettings, restaurantData]);

  // Resolved Target Restaurant ID
  const targetRestId = useMemo(() => {
    return reservation?.restaurantId || slug || tenant?.tenant?.id || tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID;
  }, [reservation?.restaurantId, slug, tenant?.tenant?.id, tenant?.targetRestaurantId]);

  const restaurantName = activeSettings?.name || restaurantData?.name || tenant?.tenant?.name || tenant?.name || 'DineMaster Bistro';
  const restaurantPhone = activeSettings?.phone || restaurantData?.phone || tenant?.tenant?.phone || '';
  const restaurantEmail = activeSettings?.email || restaurantData?.email || tenant?.tenant?.email || '';
  const brandColor = activeSettings?.branding?.primaryColor || activeSettings?.primaryColor || '#d97706';
  const rawLogo = activeSettings?.logoUrl || activeSettings?.cloudinaryLogoUrl || activeSettings?.branding?.logoUrl || (activeSettings?.branding as any)?.cloudinaryLogoUrl || '';
  const logoUrl = rawLogo.trim();

  // Single Online Modification Rule:
  // Each customer can modify their reservation online only once.
  const alreadyModifiedOnline = Boolean(
    reservation?.modifiedByCustomer || 
    reservation?.modifiedOnline || 
    reservation?.hasBeenModifiedOnline ||
    (reservation?.onlineModificationCount && reservation.onlineModificationCount >= 1) ||
    (reservation?.modificationCount && reservation.modificationCount >= 1) ||
    reservation?.history?.some(h => h.action === 'modified_by_customer')
  );

  // Customer Management Rules
  const customerMgmt = activeSettings?.customerManagement || {};
  const allowCancellation = customerMgmt.allowCustomerCancellation !== false && activeSettings?.allowCancellation !== false && (activeSettings as any)?.allowCustomerCancellation !== false;
  const allowModification = customerMgmt.allowCustomerModification !== false && (activeSettings as any)?.allowModification !== false && (activeSettings as any)?.allowCustomerModification !== false;
  const cancellationCutoffHours = customerMgmt.cancellationCutoffHours ?? 2;
  const modificationCutoffHours = customerMgmt.modificationCutoffHours ?? 2;
  const maxModGuests = customerMgmt.maxModificationGuests || activeSettings?.maxOnlineGuests || 12;
  const allowedFields = customerMgmt.allowedModificationFields || ['date', 'time', 'guests', 'notes'];

  // Calculate cutoff status
  const cutoffAnalysis = useMemo(() => {
    if (!reservation) {
      return { isPast: false, canModify: false, canCancel: false, diffHours: 0 };
    }

    try {
      const now = new Date();
      const resDateTimeStr = `${reservation.date}T${reservation.time || '12:00'}:00`;
      const resDate = new Date(resDateTimeStr);
      
      if (isNaN(resDate.getTime())) {
        return { isPast: false, canModify: allowModification && !alreadyModifiedOnline, canCancel: allowCancellation, diffHours: 99 };
      }

      const diffMs = resDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const isPast = diffHours < 0;
      const canModify = !isPast && !alreadyModifiedOnline && allowModification && diffHours >= modificationCutoffHours && reservation.status !== 'cancelled';
      const canCancel = !isPast && allowCancellation && diffHours >= cancellationCutoffHours && reservation.status !== 'cancelled';

      return {
        isPast,
        canModify,
        canCancel,
        diffHours: Math.round(diffHours * 10) / 10
      };
    } catch {
      return { isPast: false, canModify: allowModification && !alreadyModifiedOnline, canCancel: allowCancellation, diffHours: 99 };
    }
  }, [reservation, alreadyModifiedOnline, allowModification, allowCancellation, modificationCutoffHours, cancellationCutoffHours]);

  // 1. Fetch tables and areas for this restaurant
  useEffect(() => {
    if (!targetRestId) return;

    let isMounted = true;
    async function loadTablesAndAreas() {
      try {
        const isDefault = targetRestId === DEFAULT_RESTAURANT_ID || targetRestId === 'main';

        const tQuery = isDefault
          ? query(collection(db, 'tables'))
          : query(collection(db, 'tables'), where('restaurantId', '==', targetRestId));
        const tSnap = await getDocs(tQuery);
        let loadedTables = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Table));
        if (isDefault) {
          loadedTables = loadedTables.filter(t => !t.restaurantId || t.restaurantId === DEFAULT_RESTAURANT_ID || t.restaurantId === 'main');
        } else {
          loadedTables = loadedTables.filter(t => t.restaurantId === targetRestId);
        }
        if (loadedTables.length === 0) {
          loadedTables = DEFAULT_TABLES.map(t => ({ ...t, restaurantId: targetRestId }));
        }

        const aQuery = isDefault
          ? query(collection(db, 'areas'))
          : query(collection(db, 'areas'), where('restaurantId', '==', targetRestId));
        const aSnap = await getDocs(aQuery);
        let loadedAreas = aSnap.docs.map(d => ({ id: d.id, ...d.data() } as Area));
        if (isDefault) {
          loadedAreas = loadedAreas.filter(a => !a.restaurantId || a.restaurantId === DEFAULT_RESTAURANT_ID || a.restaurantId === 'main');
        } else {
          loadedAreas = loadedAreas.filter(a => a.restaurantId === targetRestId);
        }

        if (isMounted) {
          setTables(loadedTables);
          setAreas(loadedAreas);
        }
      } catch (err) {
        console.warn('[CustomerManagement] Notice fetching tables/areas:', err);
        if (isMounted) {
          setTables(DEFAULT_TABLES);
        }
      }
    }

    loadTablesAndAreas();
    return () => {
      isMounted = false;
    };
  }, [targetRestId]);

  // 2. Fetch reservations on the selected editDate
  useEffect(() => {
    if (!editDate) return;

    let isMounted = true;
    async function loadDateReservations() {
      setCheckingAvailability(true);
      try {
        const isDefault = targetRestId === DEFAULT_RESTAURANT_ID || targetRestId === 'main';
        const qRes = query(
          collection(db, 'reservations'),
          where('date', '==', editDate)
        );
        const snap = await getDocs(qRes);
        let dateRes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
        if (isDefault) {
          dateRes = dateRes.filter(r => !r.restaurantId || r.restaurantId === DEFAULT_RESTAURANT_ID || r.restaurantId === 'main');
        } else {
          dateRes = dateRes.filter(r => r.restaurantId === targetRestId);
        }

        if (isMounted) {
          setDateReservations(dateRes);
        }
      } catch (err) {
        console.warn('[CustomerManagement] Notice loading reservations for date:', err);
        if (isMounted) {
          setDateReservations([]);
        }
      } finally {
        if (isMounted) {
          setCheckingAvailability(false);
        }
      }
    }

    loadDateReservations();
    return () => {
      isMounted = false;
    };
  }, [editDate, targetRestId]);

  // 3. Compute available time slots whenever editDate, editGuests, activeSettings, tables, or dateReservations change
  useEffect(() => {
    if (!editDate) return;

    const res = calculateAvailableTimeSlots({
      date: editDate,
      guests: editGuests,
      currentResId: reservation?.id,
      currentBookingNumber: reservation?.bookingNumber,
      settings: activeSettings,
      tables,
      areas,
      reservations: dateReservations,
      bufferMinutes: 20
    });

    setAvailableTimeSlots(res.availableSlots);
    setSlotsBySession(res.slotsBySession);
    setClosedReason(res.isClosed ? (res.closedReason || (isPt ? 'Fechado nesta data' : 'Closed on this date')) : null);

    // Keep current selection if valid, or select first available slot
    if (res.availableSlots.length > 0) {
      if (!editTime || !res.availableSlots.includes(editTime)) {
        setEditTime(res.availableSlots[0]);
      }
    } else {
      setEditTime('');
    }
  }, [editDate, editGuests, activeSettings, tables, areas, dateReservations, reservation?.id, reservation?.bookingNumber, isPt]);

  const copyReference = () => {
    if (!reservation) return;
    const ref = reservation.bookingNumber ? `#${reservation.bookingNumber}` : reservation.id;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    toast.success(isPt ? 'Referência copiada!' : 'Booking reference copied!');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Handle Customer Modification Submission
  const handleSubmitModify = async () => {
    if (!reservation) return;

    if (alreadyModifiedOnline) {
      toast.error(
        isPt
          ? 'Esta reserva já foi alterada online uma vez. Para efetuar alterações adicionais, é necessário contactar o restaurante diretamente.'
          : 'This reservation has already been modified online once. To make any further changes, please contact the restaurant directly.'
      );
      setActiveModal('none');
      return;
    }

    if (!editTime || availableTimeSlots.length === 0) {
      toast.error(isPt ? 'Por favor selecione um horário disponível.' : 'Please select an available time slot.');
      return;
    }

    setIsSubmittingModify(true);

    try {
      // Find best available table for the updated booking
      const chosenTable = findBestTableForBooking({
        date: editDate,
        time: editTime,
        guests: editGuests,
        currentResId: reservation.id,
        currentBookingNumber: reservation.bookingNumber,
        preferredTableId: reservation.tableId,
        tables,
        areas,
        reservations: dateReservations,
        settings: activeSettings
      });

      if (!chosenTable && tables.length > 0) {
        toast.error(isPt ? 'O horário selecionado já não se encontra disponível.' : 'The selected time slot is no longer available.');
        setIsSubmittingModify(false);
        return;
      }

      const docRef = doc(db, 'reservations', reservation.id);
      const nowIso = new Date().toISOString();
      const previousValues = {
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        notes: reservation.notes || '',
        status: reservation.status
      };

      const newValues = {
        date: editDate,
        time: editTime,
        guests: editGuests,
        notes: editNotes,
        status: 'confirmed'
      };

      const changesSummary = [
        reservation.date !== editDate ? `Date: ${reservation.date} -> ${editDate}` : '',
        reservation.time !== editTime ? `Time: ${reservation.time} -> ${editTime}` : '',
        reservation.guests !== editGuests ? `Guests: ${reservation.guests} -> ${editGuests}` : '',
        reservation.notes !== editNotes ? 'Notes updated' : ''
      ].filter(Boolean).join(', ');

      const historyEntry = {
        timestamp: nowIso,
        action: 'modified_by_customer',
        changedBy: 'customer',
        details: changesSummary || 'Reservation modified by customer',
        previousValues,
        newValues
      };

      await updateDoc(docRef, {
        date: editDate,
        time: editTime,
        guests: editGuests,
        notes: editNotes,
        tableId: chosenTable?.id || reservation.tableId || '',
        tableName: chosenTable?.name || reservation.tableName || '',
        status: 'confirmed',
        lastModifiedAt: nowIso,
        lastModifiedBy: 'customer',
        modificationCount: (reservation.modificationCount || 0) + 1,
        onlineModificationCount: (reservation.onlineModificationCount || reservation.modificationCount || 0) + 1,
        modifiedByCustomer: true,
        modifiedOnline: true,
        hasBeenModifiedOnline: true,
        customerModifiedAt: nowIso,
        history: arrayUnion(historyEntry)
      });

      // Send update email
      if (reservation.customerEmail) {
        try {
          const slugPrefix = slug || tenant?.slug ? `/r/${slug || tenant?.slug}` : '';
          await sendUpdateEmail({
            email: reservation.customerEmail,
            name: reservation.customerName,
            restaurantId: reservation.restaurantId || tenant?.tenant?.id || tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID,
            restaurantName,
            language: reservation.language || (isPt ? 'pt' : 'en'),
            date: editDate,
            time: editTime,
            guests: editGuests,
            bookingNumber: reservation.bookingNumber,
            reservationId: reservation.id,
            notes: editNotes,
            primaryColor: brandColor,
            logoUrl,
            restaurantEmail: activeSettings.email,
            restaurantPhone: activeSettings.phone,
            restaurantAddress: activeSettings.address,
            restaurantPostcode: (activeSettings as any).postcode,
            restaurantCity: activeSettings.city,
            restaurantWebsite: activeSettings.websiteUrl,
            canModifyOnline: false,
            alreadyModifiedOnline: true,
            allowCustomerModification: allowModification,
            allowCustomerCancellation: allowCancellation,
            viewUrl: `${window.location.origin}${slugPrefix}/reservations/${reservation.bookingNumber || reservation.id}`,
            cancelUrl: allowCancellation ? `${window.location.origin}${slugPrefix}/reservations/${reservation.bookingNumber || reservation.id}/cancel` : undefined,
            previousDetails: {
              date: reservation.date,
              time: reservation.time,
              guests: reservation.guests
            }
          });
        } catch (emailErr) {
          console.warn('[CustomerManagement] Notice sending update email:', emailErr);
        }
      }

      // Create Smart Alert for staff
      try {
        const alertId = `alert-mod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'smart_alerts', alertId), {
          id: alertId,
          restaurantId: reservation.restaurantId || DEFAULT_RESTAURANT_ID,
          type: 'modified_by_customer',
          title: isPt ? 'Reserva Alterada pelo Cliente' : 'Reservation Modified by Customer',
          message: `Customer ${(reservation.customerName || '').trim()} modified reservation #${reservation.bookingNumber || reservation.id}. Previous: ${reservation.date} at ${reservation.time} (${reservation.guests} guests) -> New: ${editDate} at ${editTime} (${editGuests} guests).`,
          severity: 'medium',
          status: 'active',
          relatedReservationIds: [reservation.id],
          fingerprint: `modify_${reservation.id}_${Date.now()}`,
          createdAt: nowIso,
          bookingDate: editDate
        });
      } catch (alertErr) {
        console.warn('[CustomerManagement] Notice creating smart alert:', alertErr);
      }

      // Update local state
      setReservation(prev => prev ? {
        ...prev,
        date: editDate,
        time: editTime,
        guests: editGuests,
        notes: editNotes,
        tableId: chosenTable?.id || prev.tableId,
        tableName: chosenTable?.name || prev.tableName,
        status: 'confirmed',
        lastModifiedAt: nowIso,
        lastModifiedBy: 'customer',
        modificationCount: (prev.modificationCount || 0) + 1,
        onlineModificationCount: (prev.onlineModificationCount || prev.modificationCount || 0) + 1,
        modifiedByCustomer: true,
        modifiedOnline: true,
        hasBeenModifiedOnline: true,
        customerModifiedAt: nowIso
      } : null);

      setModifyStep('success');
      toast.success(isPt ? 'Reserva atualizada com sucesso!' : 'Reservation successfully updated!');
    } catch (err: any) {
      console.error('[CustomerManagement] Error modifying reservation:', err);
      toast.error(isPt ? 'Erro ao atualizar reserva. Tente novamente.' : 'Failed to update reservation. Please try again.');
    } finally {
      setIsSubmittingModify(false);
    }
  };

  // Handle Customer Cancellation Submission
  const handleSubmitCancel = async () => {
    if (!reservation) return;
    setIsSubmittingCancel(true);

    try {
      const docRef = doc(db, 'reservations', reservation.id);
      const nowIso = new Date().toISOString();
      const fullReason = cancelReasonNote.trim() 
        ? `${cancelReasonCategory}: ${cancelReasonNote.trim()}`
        : cancelReasonCategory;

      const historyEntry = {
        timestamp: nowIso,
        action: 'cancelled_by_customer',
        changedBy: 'customer',
        details: `Cancelled by customer. Reason: ${fullReason}`,
        reason: fullReason,
        previousValues: {
          status: reservation.status
        },
        newValues: {
          status: 'cancelled'
        }
      };

      await updateDoc(docRef, {
        status: 'cancelled',
        cancelledAt: nowIso,
        cancellationReason: fullReason,
        lastModifiedAt: nowIso,
        lastModifiedBy: 'customer',
        history: arrayUnion(historyEntry)
      });

      // Send cancellation email
      if (reservation.customerEmail) {
        try {
          const slugPrefix = slug || tenant?.slug ? `/r/${slug || tenant?.slug}` : '';
          await sendCancellationEmail({
            email: reservation.customerEmail,
            name: reservation.customerName,
            restaurantId: reservation.restaurantId || tenant?.tenant?.id || tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID,
            restaurantName,
            language: reservation.language || (isPt ? 'pt' : 'en'),
            date: reservation.date,
            time: reservation.time,
            guests: reservation.guests,
            bookingNumber: reservation.bookingNumber,
            reservationId: reservation.id,
            primaryColor: brandColor,
            logoUrl,
            restaurantEmail: activeSettings.email,
            restaurantPhone: activeSettings.phone,
            restaurantAddress: activeSettings.address,
            restaurantPostcode: (activeSettings as any).postcode,
            restaurantCity: activeSettings.city,
            restaurantWebsite: activeSettings.websiteUrl,
            cancellationReason: fullReason,
            allowCustomerModification: allowModification,
            allowCustomerCancellation: allowCancellation,
            viewUrl: `${window.location.origin}${slugPrefix}/reservations/${reservation.bookingNumber || reservation.id}`
          });
        } catch (emailErr) {
          console.warn('[CustomerManagement] Notice sending cancel email:', emailErr);
        }
      }

      // Create Smart Alert for staff
      try {
        const alertId = `alert-cancel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'smart_alerts', alertId), {
          id: alertId,
          restaurantId: reservation.restaurantId || DEFAULT_RESTAURANT_ID,
          type: 'cancelled_by_customer',
          title: isPt ? 'Reserva Cancelada pelo Cliente' : 'Reservation Cancelled by Customer',
          message: `Customer ${(reservation.customerName || '').trim()} cancelled reservation #${reservation.bookingNumber || reservation.id} for ${reservation.date} at ${reservation.time} (${reservation.guests} guests). Reason: ${fullReason}`,
          severity: 'high',
          status: 'active',
          relatedReservationIds: [reservation.id],
          fingerprint: `cancel_${reservation.id}_${Date.now()}`,
          createdAt: nowIso,
          bookingDate: reservation.date
        });
      } catch (alertErr) {
        console.warn('[CustomerManagement] Notice creating cancellation alert:', alertErr);
      }

      setReservation(prev => prev ? {
        ...prev,
        status: 'cancelled',
        cancelledAt: nowIso,
        cancellationReason: fullReason,
        lastModifiedAt: nowIso,
        lastModifiedBy: 'customer'
      } : null);

      setCancelSuccess(true);
      toast.success(isPt ? 'Reserva cancelada com sucesso.' : 'Reservation successfully cancelled.');
    } catch (err: any) {
      console.error('[CustomerManagement] Error cancelling reservation:', err);
      toast.error(isPt ? 'Erro ao cancelar reserva. Tente novamente.' : 'Failed to cancel reservation. Please try again.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: brandColor, borderTopColor: 'transparent' }}
          />
          <p className="text-slate-600 font-medium">
            {isPt ? 'A carregar detalhes da sua reserva...' : 'Loading your reservation details...'}
          </p>
        </div>
      </div>
    );
  }

  // Not Found State
  if (notFound || !reservation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isPt ? 'Reserva Não Encontrada' : 'Reservation Not Found'}
          </h1>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            {isPt 
              ? 'Não foi possível encontrar nenhuma reserva correspondente à referência indicada. O link pode estar expirado ou a referência incorreta.' 
              : 'We could not locate any reservation with this reference number. The link may have expired or the reference may be invalid.'}
          </p>
          <div className="space-y-3">
            <Link 
              to={slug ? `/r/${slug}` : '/'} 
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 text-white font-bold rounded-xl shadow-md transition-all"
              style={{ backgroundColor: brandColor }}
            >
              <Utensils size={18} />
              {isPt ? 'Fazer Nova Reserva' : 'Book a New Table'}
            </Link>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              {isPt ? 'Voltar ao Início' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = reservation.status === 'cancelled';
  const bookingRef = reservation.bookingNumber ? `#${reservation.bookingNumber}` : `#${reservation.id.slice(0, 8)}`;
  const cancellationReasonsList = isPt ? CANCELLATION_REASONS_PT : CANCELLATION_REASONS_EN;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Brand Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 text-center">
          {logoUrl ? (
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt={restaurantName} 
                className="max-h-20 max-w-[240px] object-contain rounded-lg" 
              />
            </div>
          ) : (
            <div 
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              {restaurantName.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {restaurantName}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-500 mt-2">
            {activeSettings.address && (
              <span className="flex items-center gap-1.5">
                <MapPin size={15} className="text-slate-400 shrink-0" />
                {activeSettings.address}
                {(activeSettings as any).postcode ? ` ${(activeSettings as any).postcode}` : ''}
              </span>
            )}
            {activeSettings.phone && (
              <a 
                href={`tel:${activeSettings.phone.replace(/\s+/g, '')}`} 
                className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
              >
                <Phone size={15} className="text-slate-400 shrink-0" />
                {activeSettings.phone}
              </a>
            )}
            {activeSettings.email && (
              <a 
                href={`mailto:${activeSettings.email}`} 
                className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
              >
                <Mail size={15} className="text-slate-400 shrink-0" />
                {activeSettings.email}
              </a>
            )}
          </div>
        </div>

        {/* Cancellation Notice Banner if Cancelled */}
        {isCancelled && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 sm:p-6 text-rose-900 flex items-start gap-4">
            <XCircle className="text-rose-600 shrink-0 mt-0.5" size={24} />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-rose-950">
                {isPt ? 'Esta Reserva Encontra-se Cancelada' : 'This Reservation Has Been Cancelled'}
              </h3>
              <p className="text-sm text-rose-800">
                {isPt 
                  ? 'A reserva foi cancelada e a mesa libertada. Caso pretenda reservar novamente, teremos todo o gosto em recebê-lo.' 
                  : 'The booking was cancelled and the table was released. If you wish to visit at another time, please feel free to book a new table.'}
              </p>
              {reservation.cancellationReason && (
                <div className="mt-2 text-xs bg-rose-100/70 p-2.5 rounded-lg text-rose-900">
                  <strong>{isPt ? 'Motivo:' : 'Reason:'}</strong> {reservation.cancellationReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Past Reservation Notice */}
        {cutoffAnalysis.isPast && !isCancelled && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-900 flex items-start gap-3">
            <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <strong className="font-bold block mb-0.5">
                {isPt ? 'Reserva no Passado' : 'Past Reservation'}
              </strong>
              {isPt 
                ? 'A data desta reserva já passou. As opções de alteração e cancelamento online já não estão disponíveis.' 
                : 'The scheduled time for this reservation has already passed. Online modifications and cancellations are no longer available.'}
            </div>
          </div>
        )}

        {/* Already Modified Online Policy Notice */}
        {!cutoffAnalysis.isPast && !isCancelled && alreadyModifiedOnline && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 text-amber-900 flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs sm:text-sm space-y-1">
              <strong className="font-bold block text-amber-950">
                {isPt ? 'Reserva Já Alterada Online' : 'Reservation Already Modified Online'}
              </strong>
              <p className="text-amber-800 leading-relaxed">
                {isPt
                  ? 'Esta reserva já foi alterada online uma vez. O botão de alteração encontra-se desativado. Para qualquer alteração adicional, por favor contacte o restaurante diretamente.'
                  : 'This reservation has already been modified online once. The Modify Reservation button has been disabled. To make any further changes, please contact the restaurant directly.'}
              </p>
            </div>
          </div>
        )}

        {/* Cutoff Warning (If within cutoff window and not already modified) */}
        {!cutoffAnalysis.isPast && !isCancelled && !alreadyModifiedOnline && (!cutoffAnalysis.canModify || !cutoffAnalysis.canCancel) && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-800 flex items-start gap-3">
            <AlertCircle className="text-slate-500 shrink-0 mt-0.5" size={20} />
            <div className="text-xs sm:text-sm space-y-1">
              <strong className="font-bold block text-slate-900">
                {isPt ? 'Política de Antecedência do Restaurante' : 'Restaurant Notice Period Policy'}
              </strong>
              <p className="text-slate-600">
                {isPt
                  ? `As alterações online encerram com ${modificationCutoffHours}h de antecedência. Para qualquer pedido de alteração de última hora, por favor contacte o restaurante diretamente.`
                  : `Online modifications close ${modificationCutoffHours} hours prior to arrival. For last-minute changes, please contact the restaurant directly.`}
              </p>
            </div>
          </div>
        )}

        {/* Main Reservation Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
          
          {/* Header Row with Reference & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {isPt ? 'Referência da Reserva' : 'Booking Reference'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                  {bookingRef}
                </span>
                <button
                  onClick={copyReference}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title={isPt ? 'Copiar referência' : 'Copy reference'}
                >
                  {copiedRef ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                isCancelled ? "bg-rose-100 text-rose-700 border border-rose-200" :
                reservation.status === 'confirmed' || reservation.status === 'booked' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                reservation.status === 'arrived' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                reservation.status === 'completed' ? "bg-slate-100 text-slate-700 border border-slate-200" :
                "bg-amber-100 text-amber-800 border border-amber-200"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isCancelled ? "bg-rose-500" :
                  reservation.status === 'confirmed' || reservation.status === 'booked' ? "bg-emerald-500" :
                  reservation.status === 'arrived' ? "bg-blue-500" : "bg-amber-500"
                )} />
                {reservation.status === 'confirmed' || reservation.status === 'booked' ? (isPt ? 'Confirmada' : 'Confirmed') :
                 reservation.status === 'cancelled' ? (isPt ? 'Cancelada' : 'Cancelled') :
                 reservation.status === 'arrived' ? (isPt ? 'Chegou' : 'Arrived') :
                 reservation.status === 'completed' ? (isPt ? 'Concluída' : 'Completed') :
                 reservation.status}
              </span>
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
              >
                <Calendar size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isPt ? 'Data' : 'Date'}
                </span>
                <span className="text-base font-bold text-slate-900 block truncate">
                  {format(parseISO(reservation.date), 'dd/MM/yyyy')}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
              >
                <Clock size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isPt ? 'Hora' : 'Time'}
                </span>
                <span className="text-base font-bold text-slate-900 block truncate">
                  {reservation.time}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
              >
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isPt ? 'Pessoas' : 'Guests'}
                </span>
                <span className="text-base font-bold text-slate-900 block truncate">
                  {reservation.guests} {reservation.guests === 1 ? (isPt ? 'Pessoa' : 'Guest') : (isPt ? 'Pessoas' : 'Guests')}
                </span>
              </div>
            </div>
          </div>

          {/* Guest and Additional Details */}
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
            <div className="flex flex-wrap justify-between items-center text-sm py-1 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">{isPt ? 'Nome do Cliente' : 'Guest Name'}</span>
              <span className="font-bold text-slate-900">{reservation.customerName}</span>
            </div>

            {reservation.customerEmail && (
              <div className="flex flex-wrap justify-between items-center text-sm py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">{isPt ? 'Email de Contacto' : 'Email Address'}</span>
                <span className="font-semibold text-slate-900">{reservation.customerEmail}</span>
              </div>
            )}

            {reservation.customerPhone && (
              <div className="flex flex-wrap justify-between items-center text-sm py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">{isPt ? 'Telefone' : 'Phone'}</span>
                <span className="font-semibold text-slate-900">{reservation.customerPhone}</span>
              </div>
            )}

            {reservation.tableName && (
              <div className="flex flex-wrap justify-between items-center text-sm py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">{isPt ? 'Mesa Atribuída' : 'Assigned Table'}</span>
                <span className="font-bold text-slate-900">{reservation.tableName}</span>
              </div>
            )}

            {reservation.notes && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {isPt ? 'Pedidos Especiais / Notas' : 'Special Requests / Notes'}
                </span>
                <p className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200/70 italic">
                  "{reservation.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Cancellation Policy Notice */}
          <div className="mt-5 p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Info size={14} />
              {isPt ? 'Política de Reservas' : 'Reservation Policy'}
            </div>
            <p className="text-amber-800 leading-relaxed">
              {isPt
                ? (customerMgmt.cancellationPolicyNoticePt || `Cancelamentos e alterações permitidos com pelo menos ${cancellationCutoffHours} horas de antecedência.`)
                : (customerMgmt.cancellationPolicyNotice || `Cancellations and modifications are accepted up to ${cancellationCutoffHours} hours prior to your reservation time.`)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
            {!isCancelled && !cutoffAnalysis.isPast && (
              <>
                {alreadyModifiedOnline ? (
                  <div className="w-full flex flex-col gap-3">
                    <button
                      disabled
                      aria-disabled="true"
                      title={isPt ? 'Esta reserva já foi alterada online uma vez.' : 'This reservation has already been modified online once.'}
                      className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2 opacity-75 shadow-none select-none"
                    >
                      <Edit3 size={16} className="text-slate-400" />
                      {isPt ? 'Modificar Reserva' : 'Modify Reservation'}
                    </button>
                    <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950 text-sm">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        {isPt ? 'Reserva já alterada online' : 'Reservation already modified online'}
                      </div>
                      <p className="text-amber-800 leading-relaxed text-xs">
                        {isPt 
                          ? 'Esta reserva já foi alterada online uma vez. Para efetuar quaisquer alterações adicionais, é necessário contactar o restaurante diretamente.'
                          : 'This reservation has already been modified online once. To make any further changes, you must contact the restaurant directly.'}
                      </p>
                      {(restaurantPhone || restaurantEmail) && (
                        <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-semibold">
                          {restaurantPhone && (
                            <a 
                              href={`tel:${restaurantPhone.replace(/\s+/g, '')}`} 
                              className="inline-flex items-center gap-1.5 text-amber-900 hover:text-amber-700 bg-amber-100/80 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Phone size={13} />
                              {restaurantPhone}
                            </a>
                          )}
                          {restaurantEmail && (
                            <a 
                              href={`mailto:${restaurantEmail}`} 
                              className="inline-flex items-center gap-1.5 text-amber-900 hover:text-amber-700 bg-amber-100/80 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Mail size={13} />
                              {restaurantEmail}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  cutoffAnalysis.canModify && (
                    <button
                      onClick={() => {
                        setModifyStep('form');
                        setActiveModal('modify');
                      }}
                      className="flex-1 min-w-[160px] py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      <Edit3 size={16} />
                      {isPt ? 'Modificar Reserva' : 'Modify Reservation'}
                    </button>
                  )
                )}

                {cutoffAnalysis.canCancel && (
                  <button
                    onClick={() => setActiveModal('cancel')}
                    className="flex-1 min-w-[160px] py-3.5 px-6 rounded-2xl font-bold text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle size={16} />
                    {isPt ? 'Cancelar Reserva' : 'Cancel Reservation'}
                  </button>
                )}
              </>
            )}

            {isCancelled && (
              <Link
                to={slug ? `/r/${slug}` : '/'}
                className="w-full py-4 px-6 rounded-2xl font-bold text-base text-white text-center shadow-md transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: brandColor }}
              >
                <Utensils size={18} />
                {isPt ? 'Fazer Nova Reserva' : 'Book a New Reservation'}
              </Link>
            )}
          </div>
        </div>

        {/* MODAL: Modify Reservation */}
        {activeModal === 'modify' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              
              {alreadyModifiedOnline ? (
                <div className="py-4 text-center">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    {isPt ? 'Alteração Online Já Efetuada' : 'Online Modification Unavailable'}
                  </h2>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {isPt 
                      ? 'De acordo com a nossa política de reservas, cada reserva só pode ser alterada online uma única vez. Para efetuar alterações adicionais, por favor entre em contacto direto com o restaurante.'
                      : 'Per restaurant policy, online modifications can only be performed once per reservation. To make any further changes to your booking, please contact the restaurant directly.'}
                  </p>

                  {(restaurantPhone || restaurantEmail) && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left mb-6 space-y-2 text-xs">
                      <strong className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                        {isPt ? 'Contactos do Restaurante' : 'Restaurant Direct Contacts'}
                      </strong>
                      {restaurantPhone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-amber-600" />
                          <a href={`tel:${restaurantPhone.replace(/\s+/g, '')}`} className="font-semibold text-slate-900 hover:text-amber-600">
                            {restaurantPhone}
                          </a>
                        </div>
                      )}
                      {restaurantEmail && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-amber-600" />
                          <a href={`mailto:${restaurantEmail}`} className="font-semibold text-slate-900 hover:text-amber-600">
                            {restaurantEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setActiveModal('none')}
                    className="w-full py-3.5 px-6 text-white font-bold rounded-xl shadow-md cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    {isPt ? 'Voltar aos Detalhes da Reserva' : 'Return to Booking Details'}
                  </button>
                </div>
              ) : (
                <>
                  {modifyStep === 'form' && (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Edit3 size={20} style={{ color: brandColor }} />
                      {isPt ? 'Modificar Reserva' : 'Modify Reservation'}
                    </h2>
                    <button
                      onClick={() => setActiveModal('none')}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>

                  <div className="space-y-5">
                    {/* Date Field */}
                    {allowedFields.includes('date') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {isPt ? 'Nova Data' : 'New Date'}
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          max={format(addDays(new Date(), (activeSettings.maxMonthsAhead || 3) * 30), 'yyyy-MM-dd')}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full p-3.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Time Selector */}
                    {allowedFields.includes('time') && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {isPt ? 'Novo Horário' : 'New Time'}
                          </label>
                          {editTime && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                              {isPt ? 'Selecionado' : 'Selected'}: <strong>{editTime}</strong>
                            </span>
                          )}
                        </div>

                        {checkingAvailability ? (
                          <div className="text-xs text-slate-500 py-3 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: brandColor, borderTopColor: 'transparent' }} />
                            <span>{isPt ? 'A carregar horários disponíveis...' : 'Loading available times...'}</span>
                          </div>
                        ) : closedReason ? (
                          <div className="text-xs text-amber-800 bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex items-start gap-2">
                            <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                            <div>
                              <strong className="block mb-0.5">{isPt ? 'Restaurante Encerrado' : 'Restaurant Closed'}</strong>
                              <span>{closedReason}</span>
                            </div>
                          </div>
                        ) : availableTimeSlots.length > 0 ? (
                          <div className="space-y-3">
                            {/* Lunch slots */}
                            {slotsBySession.lunch.length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                  {isPt ? 'Almoço' : 'Lunch'}
                                </span>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {slotsBySession.lunch.map(time => (
                                    <button
                                      key={time}
                                      type="button"
                                      onClick={() => setEditTime(time)}
                                      className={cn(
                                        "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                        editTime === time
                                          ? "text-white shadow-sm ring-2 ring-offset-1"
                                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                      )}
                                      style={editTime === time ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                                    >
                                      {time}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Dinner slots */}
                            {slotsBySession.dinner.length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                  {isPt ? 'Jantar' : 'Dinner'}
                                </span>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {slotsBySession.dinner.map(time => (
                                    <button
                                      key={time}
                                      type="button"
                                      onClick={() => setEditTime(time)}
                                      className={cn(
                                        "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                        editTime === time
                                          ? "text-white shadow-sm ring-2 ring-offset-1"
                                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                      )}
                                      style={editTime === time ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                                    >
                                      {time}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* General slots */}
                            {slotsBySession.lunch.length === 0 && slotsBySession.dinner.length === 0 && (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {availableTimeSlots.map(time => (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => setEditTime(time)}
                                    className={cn(
                                      "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                      editTime === time
                                        ? "text-white shadow-sm ring-2 ring-offset-1"
                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                    )}
                                    style={editTime === time ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-200 flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                            <div>
                              <strong className="block mb-0.5">{isPt ? 'Sem vagas disponíveis' : 'No slots available'}</strong>
                              <span>
                                {isPt
                                  ? 'Não existem mesas disponíveis para esta data e número de pessoas. Por favor escolha outra data ou ajuste o número de pessoas.'
                                  : 'No available tables found for this date and party size. Please choose another date or adjust the number of guests.'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Guests Counter */}
                    {allowedFields.includes('guests') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {isPt ? 'Número de Pessoas' : 'Number of Guests'}
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditGuests(Math.max(1, editGuests - 1))}
                            className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <span className="text-xl font-bold text-slate-900 w-12 text-center">
                            {editGuests}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditGuests(Math.min(maxModGuests, editGuests + 1))}
                            className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                          >
                            +
                          </button>
                          <span className="text-xs text-slate-500">
                            (máx. {maxModGuests})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Notes Field */}
                    {allowedFields.includes('notes') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {isPt ? 'Pedidos Especiais / Restrições Alimentares' : 'Special Requests / Dietary Notes'}
                        </label>
                        <textarea
                          rows={3}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder={isPt ? 'Ex: Cadeira de bebé, mesa tranquila...' : 'e.g., High chair, quiet table preferred...'}
                          className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      {isPt ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={!editTime || availableTimeSlots.length === 0 || checkingAvailability}
                      onClick={() => setModifyStep('confirm')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer",
                        (!editTime || availableTimeSlots.length === 0 || checkingAvailability) ? "opacity-50 cursor-not-allowed" : "hover:opacity-95"
                      )}
                      style={{ backgroundColor: brandColor }}
                    >
                      {isPt ? 'Rever Alterações' : 'Review Changes'}
                    </button>
                  </div>
                </>
              )}

              {/* Confirmation Step */}
              {modifyStep === 'confirm' && (
                <>
                  <div className="text-center pb-4 border-b border-slate-100 mb-6">
                    <h2 className="text-xl font-bold text-slate-900">
                      {isPt ? 'Confirmar Alterações' : 'Confirm Your Changes'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {isPt ? 'Por favor, reveja os detalhes antes de submeter.' : 'Please review the updated details before confirming.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase block">{isPt ? 'Anterior' : 'Previous'}</span>
                        <div className="font-semibold text-slate-600 mt-1">
                          {reservation.date} @ {reservation.time}
                        </div>
                        <div className="text-slate-600">{reservation.guests} {isPt ? 'Pessoas' : 'Guests'}</div>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="font-bold uppercase block" style={{ color: brandColor }}>
                          {isPt ? 'Novo' : 'Updated'}
                        </span>
                        <div className="font-bold text-slate-900 mt-1">
                          {editDate} @ {editTime}
                        </div>
                        <div className="font-bold text-slate-900">{editGuests} {isPt ? 'Pessoas' : 'Guests'}</div>
                      </div>
                    </div>

                    {editNotes && (
                      <div className="pt-2 border-t border-slate-200 text-xs">
                        <span className="text-slate-500 font-bold block mb-1">{isPt ? 'Notas:' : 'Notes:'}</span>
                        <span className="text-slate-800 italic">"{editNotes}"</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSubmittingModify}
                      onClick={() => setModifyStep('form')}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                    >
                      {isPt ? 'Voltar' : 'Back'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingModify}
                      onClick={handleSubmitModify}
                      className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: brandColor }}
                    >
                      {isSubmittingModify ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {isPt ? 'A guardar...' : 'Saving...'}
                        </>
                      ) : (
                        isPt ? 'Confirmar e Guardar' : 'Confirm & Save'
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Success Step */}
              {modifyStep === 'success' && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={36} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {isPt ? 'Reserva Atualizada com Sucesso!' : 'Reservation Updated!'}
                  </h2>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                    {isPt 
                      ? 'Os novos detalhes foram confirmados no sistema e um email de confirmação foi enviado.' 
                      : 'Your updated booking has been confirmed and a confirmation email has been dispatched.'}
                  </p>

                  <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 text-left mb-6 space-y-1.5">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                      {isPt ? 'Política de Alteração Única' : 'Single Modification Policy'}
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      {isPt
                        ? 'A sua reserva foi alterada online uma vez. O botão de modificação online foi desativado. Para qualquer alteração adicional, é necessário contactar o restaurante diretamente.'
                        : 'Your reservation has been modified online once. The Modify Reservation button has now been disabled. To make any further changes, you must contact the restaurant directly.'}
                    </p>
                    {(restaurantPhone || restaurantEmail) && (
                      <div className="pt-1 flex flex-wrap items-center gap-3 font-semibold">
                        {restaurantPhone && (
                          <a href={`tel:${restaurantPhone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 text-amber-900 hover:underline">
                            <Phone size={12} /> {restaurantPhone}
                          </a>
                        )}
                        {restaurantEmail && (
                          <a href={`mailto:${restaurantEmail}`} className="inline-flex items-center gap-1 text-amber-900 hover:underline">
                            <Mail size={12} /> {restaurantEmail}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveModal('none')}
                    className="w-full py-3.5 px-6 text-white font-bold rounded-xl shadow-md cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    {isPt ? 'Fechar e Ver Reserva' : 'Close & View Reservation'}
                  </button>
                </div>
              )}
            </>
          )}
            </div>
          </div>
        )}

        {/* MODAL: Cancel Reservation */}
        {activeModal === 'cancel' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              
              {!cancelSuccess ? (
                <>
                  <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={30} />
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
                    {isPt ? 'Deseja Cancelar a Reserva?' : 'Cancel This Reservation?'}
                  </h2>

                  <p className="text-slate-600 text-xs sm:text-sm text-center mb-5 leading-relaxed">
                    {isPt 
                      ? `Tem a certeza de que pretende cancelar a sua reserva para ${reservation.guests} pessoas no dia ${format(parseISO(reservation.date), 'dd/MM/yyyy')} às ${reservation.time}?` 
                      : `Are you sure you want to cancel your reservation for ${reservation.guests} guests on ${format(parseISO(reservation.date), 'dd/MM/yyyy')} at ${reservation.time}?`}
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        {isPt ? 'Motivo do Cancelamento' : 'Reason for Cancellation'}
                      </label>
                      <select
                        value={cancelReasonCategory}
                        onChange={(e) => setCancelReasonCategory(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        {cancellationReasonsList.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        {isPt ? 'Nota Adicional (Opcional)' : 'Additional Details (Optional)'}
                      </label>
                      <textarea
                        rows={2}
                        value={cancelReasonNote}
                        onChange={(e) => setCancelReasonNote(e.target.value)}
                        placeholder={isPt ? 'Alguma observação para o restaurante...' : 'Any comments for the restaurant team...'}
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSubmittingCancel}
                      onClick={() => setActiveModal('none')}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                    >
                      {isPt ? 'Não, Manter Reserva' : 'Keep Reservation'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingCancel}
                      onClick={handleSubmitCancel}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmittingCancel ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {isPt ? 'A cancelar...' : 'Cancelling...'}
                        </>
                      ) : (
                        isPt ? 'Confirmar Cancelamento' : 'Confirm Cancellation'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={36} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    {isPt ? 'Reserva Cancelada' : 'Reservation Cancelled'}
                  </h2>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {isPt 
                      ? 'A sua reserva foi cancelada com sucesso e um email de confirmação foi enviado.' 
                      : 'Your reservation has been cancelled as requested and a confirmation email has been sent.'}
                  </p>
                  <button
                    onClick={() => setActiveModal('none')}
                    className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    {isPt ? 'Fechar' : 'Close'}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
