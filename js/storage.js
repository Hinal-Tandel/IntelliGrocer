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

export async function saveEssentialItems(items) {
    try {
        // Save to local storage first for quick access
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            console.error('No user logged in');
            return;
        }
        const user = JSON.parse(currentUser);
        const key = `${ESSENTIAL_ITEMS_KEY}_${user.email}`;
        localStorage.setItem(key, JSON.stringify(items));
        
        // Also save to Firebase if user is authenticated
        if (window.CURRENT_USER?.uid) {
            const { saveEssentialItems: fbSaveEssentialItems } = await import('./firebase.js');
            await fbSaveEssentialItems(window.CURRENT_USER.uid, items);
        }
    } catch (error) {
        console.error('Failed to save essential items', error);
    }
}

export async function loadEssentialItems() {
    try {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            return [];
        }
        const user = JSON.parse(currentUser);
        
        // Try to load from Firebase first if user is authenticated
        if (window.CURRENT_USER?.uid) {
            try {
                const { getEssentialItems: fbGetEssentialItems } = await import('./firebase.js');
                const items = await fbGetEssentialItems(window.CURRENT_USER.uid);
                if (items && items.length > 0) {
                    // Update local storage cache
                    const key = `${ESSENTIAL_ITEMS_KEY}_${user.email}`;
                    localStorage.setItem(key, JSON.stringify(items));
                    return items;
                }
            } catch (fbError) {
                console.warn('Failed to load from Firebase, falling back to local storage', fbError);
            }
        }
        
        // Fallback to local storage
        const key = `${ESSENTIAL_ITEMS_KEY}_${user.email}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Failed to load essential items', error);
        return [];
    }
}

export async function addEssentialItem(item) {
    try {
        const items = await loadEssentialItems();
        if (!items.includes(item)) {
            items.push(item);
            await saveEssentialItems(items);
        }
        return items;
    } catch (error) {
        console.error('Failed to add essential item', error);
        return await loadEssentialItems();
    }
}

export async function removeEssentialItem(item) {
    try {
        const items = await loadEssentialItems();
        const filtered = items.filter(i => i !== item);
        await saveEssentialItems(filtered);
        return filtered;
    } catch (error) {
        console.error('Failed to remove essential item', error);
        return await loadEssentialItems();
    }
}
