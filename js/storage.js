const PREF_KEY = 'userPreferences';

export function savePreferences(preferences) {
    try {
        localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
    } catch (error) {
        console.error('Failed to save preferences', error);
    }
}

export function loadPreferences() {
    try {
        const raw = localStorage.getItem(PREF_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('Failed to load preferences', error);
        return null;
    }
}
