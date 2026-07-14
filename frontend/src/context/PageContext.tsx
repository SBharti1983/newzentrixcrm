import { createContext, useContext, useState, ReactNode } from 'react';

interface PageInfo {
    title?: string;
    subtitle?: string;
}

interface PageContextType {
    pageInfo: PageInfo;
    setPageInfo: (info: PageInfo) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
    const [pageInfo, setPageInfo] = useState<PageInfo>({});

    return (
        <PageContext.Provider value={{ pageInfo, setPageInfo }}>
            {children}
        </PageContext.Provider>
    );
}

export function usePageInfo() {
    const context = useContext(PageContext);
    if (context === undefined) {
        throw new Error('usePageInfo must be used within a PageProvider');
    }
    return context;
}
