import Link from "next/link";

export default function AiuTimetableNotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="mb-4 text-4xl font-bold text-gray-900">404</h1>
                <p className="mb-8 text-xl text-gray-600">Page not found</p>
                <Link
                    href="/aiu-timetable"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                    Return to AIU Timetable
                </Link>
            </div>
        </div>
    );
}
