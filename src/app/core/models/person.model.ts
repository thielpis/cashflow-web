/** Matches CashFlow.Application.People.PersonResponse. */
export interface Person {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  /** "Μητέρα", "Φίλος"; for a family member, how they relate to the person they belong to. */
  relationship: string | null;
  /** The person whose family this one belongs to; null for the user's own people. */
  relatedToId: string | null;
  relatedToName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: number | null;
  nameDayName: string | null;
  nameDayDay: number | null;
  nameDayMonth: number | null;
  giftBudget: number | null;
  remindDaysBefore: number;
  notes: string | null;
  nextBirthday: string | null;
  turningAge: number | null;
  nextNameDay: string | null;
  /** The name day comes from the calendar rather than being set by hand. */
  nameDayFromCalendar: boolean;
}

export type PersonRequest = Omit<
  Person,
  'id' | 'fullName' | 'relatedToName' | 'nextBirthday' | 'turningAge' | 'nextNameDay' | 'nameDayFromCalendar'
>;

export type CelebrationKind = 'Birthday' | 'NameDay';

/** Matches CashFlow.Application.People.CelebrationResponse. */
export interface Celebration {
  personId: string;
  personName: string;
  relationship: string | null;
  relatedToName: string | null;
  kind: CelebrationKind;
  date: string;
  /** 0 today, 1 tomorrow. */
  daysLeft: number;
  /** The age turned on a birthday, when the year of birth is known. */
  age: number | null;
  giftBudget: number | null;
}

/** Matches CashFlow.Application.People.NameDayResponse. */
export interface NameDay {
  date: string;
  names: string[];
}
