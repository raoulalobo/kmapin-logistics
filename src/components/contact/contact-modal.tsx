/**
 * ContactModal - Modal affichant les informations de contact
 *
 * Composant Client qui affiche les coordonnées de l'entreprise dans un Dialog
 * (téléphone, email, adresse)
 */
'use client';

import { Phone, Envelope, MapPin } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ContactModalProps {
  /** État d'ouverture du modal */
  open: boolean;
  /** Fonction pour fermer le modal */
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de contact affichant les coordonnées de l'entreprise
 *
 * @param open - État d'ouverture du modal
 * @param onOpenChange - Callback pour changer l'état d'ouverture
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * <ContactModal open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Contactez-nous
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Notre équipe est à votre disposition pour répondre à toutes vos questions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Téléphone */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003D82]/10">
              <Phone className="h-6 w-6 text-[#003D82]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Téléphone</h3>
              <a
                href="tel:+33123456789"
                className="text-[#003D82] hover:underline transition-colors"
              >
                +33 1 23 45 67 89
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003D82]/10">
              <Envelope className="h-6 w-6 text-[#003D82]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
              <a
                href="mailto:contact@fasofret.fr"
                className="text-[#003D82] hover:underline transition-colors"
              >
                contact@fasofret.fr
              </a>
            </div>
          </div>

          {/* Adresse */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003D82]/10">
              <MapPin className="h-6 w-6 text-[#003D82]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Adresse</h3>
              <p className="text-gray-600 leading-relaxed">
                46 ROUTE DE GOUSSAINVILLE<br />
                95190 FONTENAY-EN-PARISIS<br />
                France
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}