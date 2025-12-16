/**
 * Composant : FaqSection
 *
 * Section FAQ (Foire aux questions) pour la page d'accueil
 * Affiche les questions fréquentes sur les services de transport et logistique
 * avec un accordéon interactif (questions cliquables qui se déplient)
 *
 * @module components/faq
 */

'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Clock,
  DollarSign,
  MapPin,
  Package,
  Truck,
  Shield,
  FileText,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

/**
 * Type pour un élément de FAQ
 * Contient la question, la réponse et l'icône associée
 */
interface FaqItem {
  /** Question affichée dans le trigger de l'accordéon */
  question: string;
  /** Réponse détaillée affichée dans le contenu de l'accordéon */
  answer: string;
  /** Icône Lucide React associée à la question */
  icon: LucideIcon;
}

/**
 * Données FAQ avec 8 questions/réponses sur le transport et la logistique
 * Couvre les sujets : délais, tarifs, zones, marchandises, tracking, assurance, douanes, problèmes
 */
const faqItems: FaqItem[] = [
  {
    question: 'Quels sont les délais de livraison pour mes expéditions ?',
    answer: 'Les délais varient selon le mode de transport choisi. Pour le transport routier en Europe, comptez 2-5 jours ouvrables. Le fret maritime prend généralement 20-45 jours selon la destination. Le fret aérien offre une livraison en 2-7 jours. Nos équipes vous fourniront une estimation précise lors de la demande de devis.',
    icon: Clock,
  },
  {
    question: 'Comment calculer le coût de mon transport ?',
    answer: 'Le coût dépend de plusieurs facteurs : poids et dimensions du colis, distance parcourue, mode de transport (routier, maritime, aérien, ferroviaire), type de marchandise, et services additionnels (assurance, douanes, livraison express). Utilisez notre calculateur de devis en ligne pour obtenir une estimation gratuite et instantanée.',
    icon: DollarSign,
  },
  {
    question: 'Quelles zones géographiques couvrez-vous ?',
    answer: 'KmapIn dispose d\'un réseau mondial couvrant plus de 150 pays. Nous opérons principalement en Europe, Afrique, Asie et Amérique avec des partenaires locaux fiables. Notre expérience particulière en Afrique de l\'Ouest nous permet d\'offrir des services optimisés dans cette région.',
    icon: MapPin,
  },
  {
    question: 'Quels types de marchandises pouvez-vous transporter ?',
    answer: 'Nous gérons une large gamme de marchandises : produits industriels, biens de consommation, équipements high-tech, produits pharmaceutiques sous température contrôlée, et matières dangereuses avec certifications ADR. Certaines marchandises réglementées nécessitent des autorisations spécifiques que nous pouvons gérer pour vous.',
    icon: Package,
  },
  {
    question: 'Comment suivre mon expédition en temps réel ?',
    answer: 'Chaque expédition reçoit un numéro de tracking unique accessible depuis votre espace client. Vous recevez des notifications par email ou SMS à chaque étape importante. Notre plateforme digitale vous permet de visualiser la position GPS en temps réel pour les transports routiers et maritimes.',
    icon: Truck,
  },
  {
    question: 'Proposez-vous une assurance pour les marchandises ?',
    answer: 'Oui, nous proposons une assurance complète couvrant vos marchandises pendant toute la durée du transport. La couverture standard est incluse, et vous pouvez souscrire à une assurance complémentaire pour les marchandises de haute valeur. Notre équipe vous conseillera sur l\'option la plus adaptée.',
    icon: Shield,
  },
  {
    question: 'Comment gérez-vous les formalités douanières ?',
    answer: 'Nos spécialistes en douane prennent en charge toutes les formalités : préparation des documents (factures commerciales, certificats d\'origine), déclarations douanières, paiement des droits et taxes. Nous assurons la conformité totale avec les réglementations internationales pour éviter tout retard.',
    icon: FileText,
  },
  {
    question: 'Que faire en cas de retard ou de problème pendant le transport ?',
    answer: 'Nos équipes sont disponibles 24/7 pour répondre à vos urgences. Contactez votre chargé de clientèle dédié ou notre service client par téléphone, email ou chat. En cas de retard, nous vous informons proactivement et proposons des solutions alternatives. Une indemnisation est possible selon les conditions du contrat de transport.',
    icon: AlertCircle,
  },
];

/**
 * Composant FaqSection
 * Section complète de FAQ avec accordéon interactif
 *
 * Caractéristiques :
 * - Accordéon Radix UI (une seule question ouverte à la fois)
 * - 8 questions/réponses avec icônes
 * - Design cohérent avec le style Rhenus (couleur #0033FF)
 * - Responsive et accessible au clavier
 * - Effets hover et transitions fluides
 */
export function FaqSection() {
  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        {/* Titre et sous-titre */}
        <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Questions fréquemment posées
        </h2>
        <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
          Tout ce que vous devez savoir sur nos services de transport et logistique
        </p>

        {/* Accordéon FAQ */}
        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-0">
            {faqItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white rounded-lg border-0 shadow-md hover:shadow-lg transition-all duration-300 ease-out hover:scale-[1.01]"
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group">
                    <div className="flex items-center gap-4 w-full">
                      {/* Icône dans un cercle bleu */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <Icon className="h-5 w-5 text-[#0033FF]" />
                      </div>

                      {/* Question */}
                      <span className="text-lg font-semibold text-gray-900 group-hover:text-[#0033FF] transition-colors text-left">
                        {item.question}
                      </span>
                    </div>
                  </AccordionTrigger>

                  {/* Réponse */}
                  <AccordionContent className="px-6 pb-5 pt-2 text-gray-600 leading-relaxed text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
