/**
 * Composant Formulaire de Planification d'Enlèvement
 *
 * Permet de planifier ou replanifier une demande d'enlèvement
 * avec date, créneau horaire et notes.
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PickupTimeSlot } from '@/lib/db/enums';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { schedulePickup, type SchedulePickupInput } from '@/modules/pickups';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

// ============================================
// TYPES ET SCHÉMA
// ============================================

/**
 * Schéma de validation du formulaire
 */
const scheduleFormSchema = z.object({
  scheduledDate: z.string().min(1, 'La date est obligatoire'),
  timeSlot: z.nativeEnum(PickupTimeSlot, {
    required_error: 'Le créneau horaire est obligatoire',
  }),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface PickupScheduleFormProps {
  pickupId: string;
  initialData?: {
    scheduledDate?: string; // Format: YYYY-MM-DD
    timeSlot?: PickupTimeSlot;
    pickupTime?: string;
  };
  isReschedule?: boolean;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Labels des créneaux horaires
 */
const TIME_SLOT_LABELS: Record<PickupTimeSlot, string> = {
  [PickupTimeSlot.MORNING]: 'Matin (8h - 12h)',
  [PickupTimeSlot.AFTERNOON]: 'Après-midi (14h - 18h)',
  [PickupTimeSlot.SPECIFIC_TIME]: 'Heure précise',
  [PickupTimeSlot.FLEXIBLE]: 'Flexible (toute la journée)',
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Formulaire de planification d'enlèvement
 *
 * @param pickupId - ID de la demande
 * @param initialData - Données initiales (pour replanification)
 * @param isReschedule - Mode replanification (vs première planification)
 *
 * @example
 * ```tsx
 * <PickupScheduleForm
 *   pickupId={pickup.id}
 *   initialData={{
 *     scheduledDate: '2026-01-20',
 *     timeSlot: PickupTimeSlot.MORNING,
 *   }}
 *   isReschedule={true}
 * />
 * ```
 */
export function PickupScheduleForm({
  pickupId,
  initialData,
  isReschedule = false,
}: PickupScheduleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      scheduledDate: initialData?.scheduledDate || '',
      timeSlot: initialData?.timeSlot || PickupTimeSlot.FLEXIBLE,
      pickupTime: initialData?.pickupTime || '',
      notes: '',
    },
  });

  // Surveiller le timeSlot pour afficher/cacher le champ pickupTime
  const selectedTimeSlot = form.watch('timeSlot');
  const needsSpecificTime = selectedTimeSlot === PickupTimeSlot.SPECIFIC_TIME;

  // Soumettre le formulaire
  const onSubmit = (data: ScheduleFormData) => {
    startTransition(async () => {
      // Construire l'input pour la Server Action
      const input: SchedulePickupInput = {
        pickupId,
        scheduledDate: data.scheduledDate,
        timeSlot: data.timeSlot,
        pickupTime:
          data.timeSlot === PickupTimeSlot.SPECIFIC_TIME && data.pickupTime
            ? data.pickupTime
            : undefined,
        notes: data.notes,
      };

      const result = await schedulePickup(input);

      if (result.success) {
        toast({
          title: isReschedule ? 'Enlèvement replanifié' : 'Enlèvement planifié',
          description: result.message,
        });

        // Rediriger vers la page de détails
        router.push(`/dashboard/pickups/${pickupId}`);
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isReschedule ? 'Nouvelle planification' : 'Planification'}
        </CardTitle>
        <CardDescription>
          {isReschedule
            ? 'Modifiez la date et le créneau horaire de l\'enlèvement'
            : 'Confirmez la date et le créneau horaire pour l\'enlèvement'}
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Date planifiée */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date d&apos;enlèvement <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10"
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Date confirmée pour l&apos;enlèvement du colis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Créneau horaire */}
            <FormField
              control={form.control}
              name="timeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Créneau horaire <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un créneau" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(PickupTimeSlot).map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {TIME_SLOT_LABELS[slot]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Plage horaire pour l&apos;enlèvement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Heure précise (si SPECIFIC_TIME) */}
            {needsSpecificTime && (
              <FormField
                control={form.control}
                name="pickupTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Heure exacte <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          className="pl-10"
                          {...field}
                          required={needsSpecificTime}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Heure précise de l&apos;enlèvement (ex: 10:30)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes optionnelles */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Coordonner avec le transporteur ABC, accès difficile le matin..."
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Remarques internes sur la planification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                'Enregistrement...'
              ) : (
                <>
                  {isReschedule ? 'Replanifier' : 'Planifier'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
