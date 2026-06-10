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
    enabled: boolean;
    setQuery: (query: string) => void;
    setPlaceholder: (placeholder: string) => void;
    setEnabled: (enabled: boolean) => void;
}

const DEFAULT_PLACEHOLDER = "Search current page...";

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [query, setQuery] = useState("");
    const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        setQuery("");
        setEnabled(false);
    }, [pathname]);

    const value = useMemo(
        () => ({
            query,
            placeholder,
            enabled,
            setQuery,
            setPlaceholder,
            setEnabled,
        }),
        [enabled, placeholder, query],
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

    const { setEnabled, setPlaceholder } = context;

    useEffect(() => {
        setEnabled(true);
        if (placeholder) {
            setPlaceholder(placeholder);
        }
        return () => {
            setEnabled(false);
            setPlaceholder(DEFAULT_PLACEHOLDER);
        };
    }, [placeholder, setEnabled, setPlaceholder]);

    return context;
}

export function useSearchControls() {
    const context = useContext(SearchContext);

    if (!context) {
        throw new Error("useSearchControls must be used inside SearchProvider");
    }

    return context;
}
