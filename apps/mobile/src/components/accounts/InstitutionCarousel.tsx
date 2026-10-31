import React from 'react';
import { InstitutionGrid } from './InstitutionGrid';
import type { Institution } from '../../types/database';

interface InstitutionCarouselProps {
    institutions: Institution[];
    onSelectInstitution: (institution: Institution) => void;
    onAddAccount: () => void;
}

export function InstitutionCarousel(props: InstitutionCarouselProps) {
    return <InstitutionGrid {...props} />;
}
