import {
    BookOpen,
    Building2,
    CalendarDays,
    DoorOpen,
    GraduationCap,
    HelpCircle,
    Home,
    LibraryBig,
    Presentation,
    School,
    ShieldCheck,
    Users,
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    group: "Main" | "Academic Structure" | "Resources" | "Scheduling" | "Administration";
}

export const NAV_ITEMS: NavItem[] = [
    {
        title: "Dashboard",
        href: "/home",
        icon: Home,
        group: "Main",
    },

    {
        title: "Faculties",
        href: "/faculties",
        icon: School,
        group: "Academic Structure",
    },
    {
        title: "Departments",
        href: "/departments",
        icon: Building2,
        group: "Academic Structure",
    },
    {
        title: "Majors",
        href: "/majors",
        icon: GraduationCap,
        group: "Academic Structure",
    },
    {
        title: "Groups",
        href: "/groups",
        icon: Users,
        group: "Academic Structure",
    },

    {
        title: "Teachers",
        href: "/teachers",
        icon: Presentation,
        group: "Resources",
    },
    {
        title: "Subjects",
        href: "/subjects",
        icon: BookOpen,
        group: "Resources",
    },
    {
        title: "Rooms",
        href: "/rooms",
        icon: DoorOpen,
        group: "Resources",
    },

    {
        title: "Timetables",
        href: "/timetables",
        icon: CalendarDays,
        group: "Scheduling",
    },
    {
        title: "Lessons",
        href: "/lessons",
        icon: LibraryBig,
        group: "Scheduling",
    },
    {
        title: "Constraints",
        href: "/constraints",
        icon: ShieldCheck,
        group: "Scheduling",
    },

    {
        title: "Users",
        href: "/users",
        icon: Users,
        group: "Administration",
    },
    {
        title: "Guide",
        href: "/guide",
        icon: HelpCircle,
        group: "Administration",
    },
];

export const NAV_GROUPS: NavItem["group"][] = [
    "Main",
    "Academic Structure",
    "Resources",
    "Scheduling",
    "Administration",
];