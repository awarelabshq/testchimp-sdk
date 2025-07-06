// Utility for time formatting

export function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) {
        return `${diff} sec${diff === 1 ? '' : 's'} ago`;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diff < 604800) {
        const days = Math.floor(diff / 86400);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
        const date = new Date(timestamp);
        const day = date.getDate();
        const daySuffix = (d) => {
            if (d > 3 && d < 21) return 'th';
            switch (d % 10) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        };
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        return `${day}${daySuffix(day)} ${month} ${year}`;
    }
} 