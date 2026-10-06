'use client';

import { TCGCardDetailContent, type TCGCardDetailContentProps } from './TCGCardDetailContent';

type TCGCardDetailModalProps = Omit<TCGCardDetailContentProps, 'presentation' | 'isOpen' | 'onClose'> & {
  isOpen: boolean;
  onClose: () => void;
};

export function TCGCardDetailModal(props: TCGCardDetailModalProps) {
  return <TCGCardDetailContent {...props} presentation="modal" />;
}
