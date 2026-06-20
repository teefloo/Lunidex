export type LegalCallout = {
  type: 'warning' | 'info' | 'success';
  text: string;
};

export type LegalSection = {
  id: string;
  title: string;
  intro?: string;
  paragraphs?: string[];
  list?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  subsections?: LegalSection[];
  callout?: LegalCallout;
};

export type LegalDocument = {
  title: string;
  intro: string;
  preamble?: string;
  lastUpdated: string;
  effectiveDate: string;
  sections: LegalSection[];
};
