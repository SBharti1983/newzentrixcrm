import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile screen sizes dynamically.
 * @param {number} breakpoint - The pixel width to consider "mobile". Default is 1024px.
 * @returns {boolean} - Returns true if the screen is smaller than the breakpoint.
 */
export function useMobile(breakpoint = 1024) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        window.addEventListener('resize', handleResize);
        
        // Initial check
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
}
