"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { TableComponent } from "nextjs-reusable-table";
import "nextjs-reusable-table/dist/index.css";

interface ProjectSummary {
  name: string;
  status: "Planning" | "Active" | "Review";
  completion: number;
  nextMilestone: string;
}

interface TeamMember {
  id: number;
  name: string;
  department: string;
  role: string;
  email: string;
  startDate: string;
  salary: number;
  status: "active" | "on-leave" | "training";
  skills: string[];
  location: string;
  mentor: string;
  availability: "in-office" | "remote" | "hybrid";
  projects: ProjectSummary[];
}

type ColumnKey =
  | "name"
  | "department"
  | "role"
  | "email"
  | "startDate"
  | "salary"
  | "status"
  | "skills";

type VisibleColumns = Record<ColumnKey, boolean>;
type SortOrder = "asc" | "desc";

interface SortConfig {
  prop: ColumnKey;
  order: SortOrder;
}

function mergeClasses(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

const TABLE_DATA: TeamMember[] = [
  {
    id: 1,
    name: "Sara Patel",
    department: "Product",
    role: "Product Lead",
    email: "sara.patel@example.com",
    startDate: "2021-03-18T08:30:00.000Z",
    salary: 132000,
    status: "active",
    skills: ["Roadmaps", "Research", "Prioritization", "Storytelling"],
    location: "Austin",
    mentor: "Michael Green",
    availability: "hybrid",
    projects: [
      {
        name: "Mercury",
        status: "Active",
        completion: 0.82,
        nextMilestone: "Beta review",
      },
      {
        name: "Atlas",
        status: "Planning",
        completion: 0.35,
        nextMilestone: "Insights recap",
      },
    ],
  },
  {
    id: 2,
    name: "Miguel Torres",
    department: "Engineering",
    role: "Staff Engineer",
    email: "miguel.torres@example.com",
    startDate: "2019-11-04T09:00:00.000Z",
    salary: 148500,
    status: "active",
    skills: ["Distributed systems", "Observability", "Rust", "Mentorship"],
    location: "Denver",
    mentor: "Alice Nguyen",
    availability: "remote",
    projects: [
      {
        name: "Nimbus",
        status: "Active",
        completion: 0.58,
        nextMilestone: "Latency fixes",
      },
      {
        name: "Orion",
        status: "Review",
        completion: 0.74,
        nextMilestone: "Resilience audit",
      },
    ],
  },
  {
    id: 3,
    name: "Aisha Khan",
    department: "Design",
    role: "Principal Designer",
    email: "aisha.khan@example.com",
    startDate: "2020-07-21T10:15:00.000Z",
    salary: 128400,
    status: "on-leave",
    skills: ["Design systems", "Accessibility", "Prototyping", "Research"],
    location: "Seattle",
    mentor: "Sara Patel",
    availability: "remote",
    projects: [
      {
        name: "Lighthouse",
        status: "Planning",
        completion: 0.18,
        nextMilestone: "Beta kits",
      },
    ],
  },
  {
    id: 4,
    name: "Lauren Kim",
    department: "Operations",
    role: "Programs Lead",
    email: "lauren.kim@example.com",
    startDate: "2022-02-14T08:00:00.000Z",
    salary: 102500,
    status: "training",
    skills: ["Enablement", "Process design", "Reporting", "Retention"],
    location: "Toronto",
    mentor: "Devon Price",
    availability: "hybrid",
    projects: [
      {
        name: "Harbor",
        status: "Active",
        completion: 0.44,
        nextMilestone: "Playbook launch",
      },
      {
        name: "Anchor",
        status: "Planning",
        completion: 0.21,
        nextMilestone: "Pilot outline",
      },
    ],
  },
];
const COLUMN_DEFINITIONS: ReadonlyArray<{ key: ColumnKey; label: string }> = [
  { key: "name", label: "Team Member" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "email", label: "Email" },
  { key: "startDate", label: "Start Date" },
  { key: "salary", label: "Salary" },
  { key: "status", label: "Status" },
  { key: "skills", label: "Key Skills" },
];

const INITIAL_VISIBLE_COLUMNS: VisibleColumns = {
  name: true,
  department: true,
  role: true,
  email: true,
  startDate: true,
  salary: true,
  status: true,
  skills: true,
};

const SORTABLE_COLUMNS: ReadonlyArray<ColumnKey> = [
  "name",
  "department",
  "role",
  "startDate",
  "salary",
  "status",
];

const STATUS_CLASS_MAP: Record<TeamMember["status"], string[]> = {
  active: [
    "bg-emerald-100",
    "text-emerald-700",
    "dark:bg-emerald-900/40",
    "dark:text-emerald-200",
  ],
  "on-leave": [
    "bg-amber-100",
    "text-amber-700",
    "dark:bg-amber-900/40",
    "dark:text-amber-200",
  ],
  training: [
    "bg-sky-100",
    "text-sky-700",
    "dark:bg-sky-900/40",
    "dark:text-sky-200",
  ],
};

const PROJECT_STATUS_CLASS_MAP: Record<ProjectSummary["status"], string[]> = {
  Planning: ["text-amber-600", "dark:text-amber-300"],
  Active: ["text-emerald-600", "dark:text-emerald-300"],
  Review: ["text-sky-600", "dark:text-sky-300"],
};

const STATUS_FILTER_OPTIONS: ReadonlyArray<"all" | TeamMember["status"]> = [
  "all",
  "active",
  "on-leave",
  "training",
];

const PAGE_SIZE_OPTIONS = [4, 8, 12];

const ACTION_LABELS = ["View profile", "Message", "Promote"];
export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | TeamMember["status"]>("all");
  const [departmentFilter, setDepartmentFilter] =
    useState<"all" | TeamMember["department"]>("all");
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(
    () => ({ ...INITIAL_VISIBLE_COLUMNS }),
  );
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(
    () => new Set<number>(),
  );
  const [activityNote, setActivityNote] = useState<string | null>(null);
  const [highlightedMember, setHighlightedMember] =
    useState<TeamMember | null>(null);

  const departmentOptions = useMemo(() => {
    const values = new Set<string>();
    TABLE_DATA.forEach((member) => values.add(member.department));
    return ["all", ...Array.from(values)];
  }, []);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    [],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return TABLE_DATA.filter((member) => {
      const matchesStatus =
        statusFilter === "all" || member.status === statusFilter;
      const matchesDepartment =
        departmentFilter === "all" || member.department === departmentFilter;
      const searchableContent = [
        member.name,
        member.email,
        member.role,
        member.department,
        member.location,
        member.skills.join(" "),
        member.projects.map((project) => project.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        term.length === 0 || searchableContent.includes(term);
      return matchesStatus && matchesDepartment && matchesSearch;
    });
  }, [statusFilter, departmentFilter, searchTerm]);

  const sortedMembers = useMemo(() => {
    if (!sortConfig) {
      return filteredMembers;
    }
    const sorted = [...filteredMembers];
    const { prop, order } = sortConfig;
    sorted.sort((a, b) => {
      const aValue = a[prop];
      const bValue = b[prop];
      if (prop === "startDate") {
        const aTime = new Date(String(aValue)).getTime();
        const bTime = new Date(String(bValue)).getTime();
        return order === "asc" ? aTime - bTime : bTime - aTime;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aText = String(aValue).toLowerCase();
      const bText = String(bValue).toLowerCase();
      return order === "asc"
        ? aText.localeCompare(bText)
        : bText.localeCompare(aText);
    });
    return sorted;
  }, [filteredMembers, sortConfig]);

  const activeColumns = useMemo(
    () =>
      COLUMN_DEFINITIONS.filter((column) => visibleColumns[column.key]),
    [visibleColumns],
  );

  const columnLabels = useMemo(
    () => activeColumns.map((column) => column.label),
    [activeColumns],
  );

  const columnProps = useMemo(
    () =>
      activeColumns.map((column) => column.key) as ReadonlyArray<
        keyof TeamMember
      >,
    [activeColumns],
  );

  const sortableProps = useMemo(
    () =>
      activeColumns
        .filter((column) => SORTABLE_COLUMNS.includes(column.key))
        .map((column) => column.key) as ReadonlyArray<keyof TeamMember>,
    [activeColumns],
  );

  const totalResults = filteredMembers.length;
  const rangeStart = totalResults === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(page * itemsPerPage, totalResults);
  const activeColumnCount = activeColumns.length;

  const toggleColumn = useCallback(
    (key: ColumnKey) => {
      setVisibleColumns((previous) => {
        const activeCount = Object.values(previous).filter(Boolean).length;
        if (previous[key] && activeCount === 1) {
          return previous;
        }
        return { ...previous, [key]: !previous[key] };
      });
      setPage(1);
    },
    [setPage],
  );

  const resetColumns = useCallback(() => {
    setVisibleColumns({ ...INITIAL_VISIBLE_COLUMNS });
    setPage(1);
  }, [setPage]);

  const toggleRowExpansion = useCallback((memberId: number) => {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const ensureExpanded = useCallback((memberId: number) => {
    setExpandedRows((previous) => {
      if (previous.has(memberId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(memberId);
      return next;
    });
  }, []);

  const handleSort = useCallback((prop: keyof TeamMember) => {
    const column = prop as ColumnKey;
    if (!SORTABLE_COLUMNS.includes(column)) {
      return;
    }
    setSortConfig((current) => {
      if (current && current.prop === column) {
        const nextOrder: SortOrder = current.order === "asc" ? "desc" : "asc";
        return { prop: column, order: nextOrder };
      }
      return { prop: column, order: "asc" };
    });
  }, []);

  const handleRowClick = useCallback(
    (member: TeamMember) => {
      ensureExpanded(member.id);
      setHighlightedMember(member);
      setActivityNote(`Opened detail for ${member.name}`);
    },
    [ensureExpanded],
  );

  const handleAction = useCallback(
    (label: string, member: TeamMember) => {
      setActivityNote(`${label}: ${member.name}`);
      setHighlightedMember(member);
      ensureExpanded(member.id);
    },
    [ensureExpanded],
  );

  const actionHandlers = useMemo(
    () =>
      ACTION_LABELS.map(
        (label) => (member: TeamMember) => handleAction(label, member),
      ),
    [handleAction],
  );

  const formatHeader = useCallback((header: string) => {
    const abbreviation = header
      .split(" ")
      .filter(Boolean)
      .map((token) => token[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <span
          className={mergeClasses(
            "flex h-6 w-6 items-center justify-center rounded-full",
            "bg-zinc-200 text-xs font-semibold text-zinc-700",
            "dark:bg-neutral-700 dark:text-zinc-100",
          )}
        >
          {abbreviation}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {header}
        </span>
      </div>
    );
  }, []);

  const formatValue = useCallback(
    (value: string, prop: string, member: TeamMember) => {
      const key = prop as ColumnKey;
      if (key === "name") {
        const isExpanded = expandedRows.has(member.id);
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleRowExpansion(member.id);
                }}
                className={mergeClasses(
                  "mt-1 flex h-7 w-7 items-center justify-center rounded-full",
                  "border border-zinc-300 text-xs font-semibold text-zinc-600",
                  "transition-colors hover:bg-zinc-200",
                  "dark:border-neutral-600 dark:text-zinc-200",
                  "dark:hover:bg-neutral-700",
                )}
                aria-label={
                  isExpanded
                    ? `Collapse details for ${member.name}`
                    : `Expand details for ${member.name}`
                }
              >
                {isExpanded ? "-" : "+"}
              </button>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {member.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {member.role} • {member.location} • {member.availability}
                </p>
              </div>
            </div>
            {isExpanded && (
              <div
                className={mergeClasses(
                  "rounded-xl border border-zinc-200 bg-white p-4 text-xs",
                  "shadow-sm dark:border-neutral-700 dark:bg-neutral-900",
                )}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                        Mentor
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {member.mentor}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                        Start date
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {dateFormatter.format(new Date(member.startDate))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {member.projects.map((project) => (
                      <div
                        key={project.name}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <div>
                          <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                            {project.name}
                          </p>
                          <p
                            className={mergeClasses(
                              "text-zinc-500 dark:text-zinc-400",
                              ...PROJECT_STATUS_CLASS_MAP[project.status],
                            )}
                          >
                            {project.status} · {project.nextMilestone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-zinc-200 dark:bg-neutral-800">
                            <div
                              className="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                              style={{
                                width: `${Math.round(project.completion * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-zinc-500 dark:text-zinc-300">
                            {Math.round(project.completion * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }
      if (key === "email") {
        return (
          <a
            href={`mailto:${member.email}`}
            className={mergeClasses(
              "text-sm text-blue-600 underline",
              "decoration-dotted hover:decoration-solid",
              "dark:text-blue-300",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {member.email}
          </a>
        );
      }
      if (key === "startDate") {
        return dateFormatter.format(new Date(member.startDate));
      }
      if (key === "salary") {
        return currencyFormatter.format(member.salary);
      }
      if (key === "status") {
        return (
          <span
            className={mergeClasses(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              ...STATUS_CLASS_MAP[member.status],
            )}
          >
            {member.status.replace("-", " ")}
          </span>
        );
      }
      return value;
    },
    [currencyFormatter, dateFormatter, expandedRows, toggleRowExpansion],
  );

  const tableClassNames = useMemo(
    () => ({
      container: mergeClasses(
        "rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl",
        "dark:border-neutral-700 dark:bg-neutral-950/80",
      ),
      scrollContainer: mergeClasses(
        "max-h-[65vh] overflow-auto",
        "scrollbar-thin scrollbar-thumb-zinc-300",
        "dark:scrollbar-thumb-neutral-700",
      ),
      table: "min-w-full",
      th: mergeClasses(
        "text-xs font-semibold uppercase tracking-wide text-zinc-500",
        "dark:text-zinc-400",
      ),
      tr: mergeClasses(
        "transition-colors",
        "hover:bg-zinc-100 dark:hover:bg-neutral-800/60",
      ),
      td: mergeClasses(
        "align-top text-sm text-zinc-700",
        "dark:text-zinc-200",
      ),
      interactive: {
        sortableCursor: "cursor-pointer",
        clickableCursor: "cursor-pointer",
      },
      pagination: {
        container: mergeClasses(
          "flex flex-wrap items-center justify-between gap-3 border-t",
          "border-zinc-200 pt-4 dark:border-neutral-700",
        ),
        button: mergeClasses(
          "rounded-full border border-zinc-300 px-4 py-2 text-sm",
          "font-medium text-zinc-700 hover:bg-zinc-100",
          "dark:border-neutral-600 dark:text-zinc-200",
          "dark:hover:bg-neutral-800",
        ),
        buttonDisabled: "opacity-40 cursor-not-allowed",
        pageInfo: mergeClasses(
          "text-sm font-medium text-zinc-600",
          "dark:text-zinc-300",
        ),
        navigation: {
          first: "",
          previous: "",
          next: "",
          last: "",
        },
      },
      cellExpansion: {
        container: mergeClasses(
          "rounded-lg border border-zinc-200 bg-zinc-50 p-3 shadow-sm",
          "dark:border-neutral-700 dark:bg-neutral-900",
        ),
      },
    }),
    [],
  );

  const cellExpansionConfig = useMemo(
    () => ({
      enabled: true,
      maxWidth: 320,
      behavior: "wrap" as const,
    }),
    [],
  );

  const accessibilityConfig = useMemo(
    () => ({
      focusStyles: "focus:outline-none focus:ring-2 focus:ring-blue-500",
      screenReaderLabels: {
        actions: "Row actions",
        pagination: "Table pagination controls",
        loading: "Loading team members",
      },
      keyboardNavigation: true,
    }),
    [],
  );

  const noContentProps = useMemo(
    () => ({
      text: "No team members match the current filters.",
      icon: <span aria-hidden="true">[]</span>,
      name: "Empty table state",
    }),
    [],
  );

  const tableStyles = useMemo(
    () => ({
      scrollContainer: { borderRadius: "1.5rem" },
    }),
    [],
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
      setPage(1);
    },
    [setPage],
  );

  const handleStatusFilterChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(event.target.value as "all" | TeamMember["status"]);
      setPage(1);
    },
    [setPage],
  );

  const handleDepartmentFilterChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setDepartmentFilter(
        event.target.value as "all" | TeamMember["department"],
      );
      setPage(1);
    },
    [setPage],
  );

  const handleItemsPerPageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(event.target.value));
      setPage(1);
    },
    [setPage],
  );
