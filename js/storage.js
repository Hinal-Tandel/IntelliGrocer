const PREF_KEY = 'userPreferences';
const ESSENTIAL_ITEMS_KEY = 'essentialItems';

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

export function saveEssentialItems(items) {
    try {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            console.error('No user logged in');
            return;
        }
        const user = JSON.parse(currentUser);
        const key = `${ESSENTIAL_ITEMS_KEY}_${user.email}`;
        localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
        console.error('Failed to save essential items', error);
    }
}

export function loadEssentialItems() {
    try {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            return [];
        }
        const user = JSON.parse(currentUser);
        const key = `${ESSENTIAL_ITEMS_KEY}_${user.email}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Failed to load essential items', error);
        return [];
    }
}

export function addEssentialItem(item) {
    try {
        const items = loadEssentialItems();
        if (!items.includes(item)) {
            items.push(item);
            saveEssentialItems(items);
        }
        return items;
    } catch (error) {
        console.error('Failed to add essential item', error);
        return loadEssentialItems();
    }
}

export function removeEssentialItem(item) {
    try {
        const items = loadEssentialItems();
        const filtered = items.filter(i => i !== item);
        saveEssentialItems(filtered);
        return filtered;
    } catch (error) {
        console.error('Failed to remove essential item', error);
        return loadEssentialItems();
    }
}
