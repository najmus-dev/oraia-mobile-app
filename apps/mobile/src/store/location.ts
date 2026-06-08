export type Location = {
  id: string;
  name: string;
  address?: string;
  isInstalled?: boolean;
};

export type LocationState = {
  locationId: string | null;
  locations: Location[];
};

export const locationState: LocationState = {
  locationId: null,
  locations: [],
};
