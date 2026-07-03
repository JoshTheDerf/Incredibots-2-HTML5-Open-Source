// Jaybit save-exposure enum + decode helper (node-clean, no deps).
//
// SaveWindow.as:19-27 defines a 5-value exposure combo shown on every save.
// It is persisted as `expo + 2` in the header int CE used for allowEdit
// (which was only ever 0/1): a loaded value > 1 is a Jaybit exposure
// (subtract 2), a value <= 1 is a legacy allowEdit and maps to
// public+editable (ImportRobot :3173-3185 and the challenge/replay twins).

export const EXPO_PUBLIC_UNEDITABLE = 0;
export const EXPO_PUBLIC_EDITABLE = 1;
export const EXPO_PRIVATE_UNEDITABLE = 2;
export const EXPO_PRIVATE_EDITABLE = 3;
export const EXPO_PRIVATE_NOSHARE = 4;

/** The public/editable flags an exposure value decodes to. */
export interface ExposureFlags {
	expo: number;
	isPublic: boolean;
	isEditable: boolean;
}

/**
 * Database.DetermineExposure (:666-750) collapsed to its flag mapping: values
 * 0-3 map as named; ANY other value — which includes NOSHARE=4 — falls into
 * the final else: private + uneditable. ("public" only mattered for the dead
 * cloud sharing; "editable" gates the editor.)
 */
export function determineExposure(expo: number): ExposureFlags {
	switch (expo) {
		case EXPO_PUBLIC_UNEDITABLE:
			return { expo, isPublic: true, isEditable: false };
		case EXPO_PUBLIC_EDITABLE:
			return { expo, isPublic: true, isEditable: true };
		case EXPO_PRIVATE_UNEDITABLE:
			return { expo, isPublic: false, isEditable: false };
		case EXPO_PRIVATE_EDITABLE:
			return { expo, isPublic: false, isEditable: true };
		default:
			return { expo, isPublic: false, isEditable: false };
	}
}

/**
 * Decode the header "allowEdit" int of an import: > 1 is a Jaybit `expo + 2`;
 * <= 1 is a legacy CE allowEdit and is ignored — legacy codes are always
 * public + editable (ImportRobot :3178-3185).
 */
export function decodeExposureInt(headerInt: number): ExposureFlags {
	if (headerInt > 1) return determineExposure(headerInt - 2);
	return { expo: EXPO_PUBLIC_EDITABLE, isPublic: true, isEditable: true };
}
