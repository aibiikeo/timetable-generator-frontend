"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { usePathname } from "next/navigation";

interface SearchContextValue {
    query: string;
    placeholder: string;
    setQuery: (query: string) => void;
    setPlaceholder: (placeholder: string) => void;
}

const DEFAULT_PLACEHOLDER = "Search current page...";

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [query, setQuery] = useState("");
    const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);

    useEffect(() => {
        setQuery("");
    }, [pathname]);

    const value = useMemo(
        () => ({
            query,
            placeholder,
            setQuery,
            setPlaceholder,
        }),
        [placeholder, query],
    );

    return (
        <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
    );
}

export function usePageSearch(placeholder?: string) {
    const context = useContext(SearchContext);

    if (!context) {
        throw new Error("usePageSearch must be used inside SearchProvider");
    }

    useEffect(() => {
        if (!placeholder) return;

        context.setPlaceholder(placeholder);
        return () => context.setPlaceholder(DEFAULT_PLACEHOLDER);
    }, [context.setPlaceholder, placeholder]);

    return context;
}
