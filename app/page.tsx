"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ChangeEvent } from "react";
import { TableComponent } from "nextjs-reusable-table";
import "nextjs-reusable-table/dist/index.css";
import {
  createCurrencyFormatter,
  createDateFormatter,
  createHeaderAbbreviation,
  formatPercentage,
  mergeClasses
} from "../utils/tableUtils";

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
const TABLE_DATA: ReadonlyArray<TeamMember> = [
  {
    id: 101,
    name: "Sara Patel",
    department: "Product",
    role: "Lead Product Manager",
    email: "sara.patel@example.com",
    startDate: "2021-03-18T08:30:00.000Z",
    salary: 132000,
    status: "active",
    skills: [
      "Roadmaps",
      "User research",
      "Prioritization",
      "Experimentation",
      "Storytelling"
    ],
    location: "Austin",
    mentor: "Michael Green",
    availability: "hybrid",
    projects: [
      {
        name: "Mercury",
        status: "Active",
        completion: 0.86,
        nextMilestone: "Beta launch"
      },
      {
        name: "Atlas",
        status: "Planning",
        completion: 0.34,
        nextMilestone: "Research summary"
      }
    ]
  },
  {
    id: 102,
    name: "Miguel Torres",
    department: "Engineering",
    role: "Staff Software Engineer",
    email: "miguel.torres@example.com",
    startDate: "2019-11-04T09:00:00.000Z",
    salary: 148500,
    status: "active",
    skills: [
      "Distributed systems",
      "Observability",
      "Rust",
      "TypeScript",
      "Mentorship"
    ],
    location: "Denver",
    mentor: "Alice Nguyen",
    availability: "remote",
    projects: [
      {
        name: "Nimbus",
        status: "Active",
        completion: 0.58,
        nextMilestone: "Latency fixes"
      },
      {
        name: "Orion",
        status: "Review",
        completion: 0.72,
        nextMilestone: "Resilience audit"
      }
    ]
  },
  {
    id: 103,
    name: "Aisha Khan",
    department: "Design",
    role: "Principal Product Designer",
    email: "aisha.khan@example.com",
    startDate: "2020-07-21T10:15:00.000Z",
    salary: 128400,
    status: "on-leave",
    skills: [
      "Design systems",
      "Accessibility",
      "Workshop facilitation",
      "Prototyping"
    ],
    location: "Seattle",
    mentor: "Sara Patel",
    availability: "remote",
    projects: [
      {
        name: "Lighthouse",
        status: "Planning",
        completion: 0.18,
        nextMilestone: "Customer journey draft"
      }
    ]
  },
  {
    id: 104,
    name: "Devon Price",
    department: "Data Science",
    role: "Senior Analytics Lead",
    email: "devon.price@example.com",
    startDate: "2018-05-10T12:00:00.000Z",
    salary: 121200,
    status: "active",
    skills: [
      "Forecasting",
      "Machine learning",
      "AB testing",
      "SQL",
      "Storytelling"
    ],
    location: "Chicago",
    mentor: "Miguel Torres",
    availability: "in-office",
    projects: [
      {
        name: "Pulse",
        status: "Active",
        completion: 0.64,
        nextMilestone: "Insight rollout"
      },
      {
        name: "Beacon",
        status: "Review",
        completion: 0.91,
        nextMilestone: "Executive briefing"
      }
    ]
  },
  {
    id: 105,
    name: "Lauren Kim",
    department: "Operations",
    role: "Customer Programs Lead",
    email: "lauren.kim@example.com",
    startDate: "2022-02-14T08:00:00.000Z",
    salary: 102500,
    status: "training",
    skills: [
      "Program design",
      "Enablement",
      "Reporting",
      "Retention",
      "Workshop design"
    ],
    location: "Toronto",
    mentor: "Devon Price",
    availability: "hybrid",
    projects: [
      {
        name: "Harbor",
        status: "Active",
        completion: 0.41,
        nextMilestone: "Playbook release"
      },
      {
        name: "Anchor",
        status: "Planning",
        completion: 0.23,
        nextMilestone: "Pilot outline"
      }
    ]
  },
  {
    id: 106,
    name: "Priya Desai",
    department: "Customer Success",
    role: "Enterprise Success Manager",
    email: "priya.desai@example.com",
    startDate: "2017-09-05T09:45:00.000Z",
    salary: 118750,
    status: "active",
    skills: [
      "Executive alignment",
      "Expansion strategy",
      "Health scoring",
      "Churn mitigation"
    ],
    location: "New York",
    mentor: "Lauren Kim",
    availability: "in-office",
    projects: [
      {
        name: "Summit",
        status: "Active",
        completion: 0.79,
        nextMilestone: "Quarterly review"
      },
      {
        name: "Northstar",
        status: "Review",
        completion: 0.52,
        nextMilestone: "Renewal forecast"
      }
    ]
  },
  {
    id: 107,
    name: "Noah Williams",
    department: "Security",
    role: "Security Program Manager",
    email: "noah.williams@example.com",
    startDate: "2021-09-01T11:20:00.000Z",
    salary: 115400,
    status: "active",
    skills: [
      "Risk assessment",
      "Vendor reviews",
      "Incident response",
      "Policy writing"
    ],
    location: "Phoenix",
    mentor: "Sara Patel",
    availability: "remote",
    projects: [
      {
        name: "Shield",
        status: "Active",
        completion: 0.47,
        nextMilestone: "Audit dry run"
      },
      {
        name: "Fortress",
        status: "Planning",
        completion: 0.29,
        nextMilestone: "Vendor scoring"
      }
    ]
  },
  {
    id: 108,
    name: "Chloe Martin",
    department: "Marketing",
    role: "Lifecycle Marketing Lead",
    email: "chloe.martin@example.com",
    startDate: "2023-01-09T07:50:00.000Z",
    salary: 98000,
    status: "training",
    skills: [
      "Lifecycle strategy",
      "Copywriting",
      "Segmentation",
      "Automation"
    ],
    location: "San Diego",
    mentor: "Noah Williams",
    availability: "hybrid",
    projects: [
      {
        name: "Orbit",
        status: "Active",
        completion: 0.38,
        nextMilestone: "Nurture launch"
      },
      {
        name: "Nova",
        status: "Planning",
        completion: 0.16,
        nextMilestone: "Audience model"
      }
    ]
  }
];
const COLUMN_DEFINITIONS: ReadonlyArray<{ key: ColumnKey; label: string }> = [
  { key: "name", label: "Team Member" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "email", label: "Email" },
  { key: "startDate", label: "Start Date" },
  { key: "salary", label: "Salary" },
  { key: "status", label: "Status" },
  { key: "skills", label: "Key Skills" }
];

const INITIAL_VISIBLE_COLUMNS: VisibleColumns = {
  name: true,
  department: true,
  role: true,
  email: true,
  startDate: true,
  salary: true,
  status: true,
  skills: true
};

const SORTABLE_COLUMNS: ReadonlyArray<ColumnKey> = [
  "name",
  "department",
  "role",
  "startDate",
  "salary",
  "status"
];

const STATUS_CLASS_MAP: Record<TeamMember["status"], string[]> = {
  active: [
    "bg-emerald-100",
    "text-emerald-700",
    "dark:bg-emerald-900/40",
    "dark:text-emerald-200"
  ],
  "on-leave": [
    "bg-amber-100",
    "text-amber-700",
    "dark:bg-amber-900/40",
    "dark:text-amber-200"
  ],
  training: [
    "bg-sky-100",
    "text-sky-700",
    "dark:bg-sky-900/40",
    "dark:text-sky-200"
  ]
};

const PROJECT_STATUS_CLASS_MAP: Record<ProjectSummary["status"], string[]> = {
  Planning: ["text-amber-600", "dark:text-amber-300"],
  Active: ["text-emerald-600", "dark:text-emerald-300"],
  Review: ["text-sky-600", "dark:text-sky-300"]
};

const STATUS_FILTER_OPTIONS: ReadonlyArray<"all" | TeamMember["status"]> = [
  "all",
  "active",
  "on-leave",
  "training"
];

const PAGE_SIZE_OPTIONS = [5, 10, 15];

const ACTION_LABELS = ["View profile", "Message", "Promote"];
export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | TeamMember["status"]>("all");
  const [departmentFilter, setDepartmentFilter] =
    useState<"all" | TeamMember["department"]>("all");
  const [itemsPerPage, setItemsPerPage] = useState(
    PAGE_SIZE_OPTIONS[0]
  );
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(
    () => ({ ...INITIAL_VISIBLE_COLUMNS })
  );
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(
    () => new Set<number>()
  );
  const [selectedMember, setSelectedMember] =
    useState<TeamMember | null>(null);
  const [activityNote, setActivityNote] = useState<string | null>(null);

  const departmentOptions = useMemo(() => {
    const values = new Set<string>();
    TABLE_DATA.forEach((member) => values.add(member.department));
    return ["all", ...Array.from(values)];
  }, []);

  const currencyFormatter = useMemo(
    () => createCurrencyFormatter("en-US", "USD"),
    []
  );

  const dateFormatter = useMemo(
    () =>
      createDateFormatter("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
    []
  );
  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return TABLE_DATA.filter((member) => {
      const matchesStatus =
        statusFilter === "all" || member.status === statusFilter;
      const matchesDepartment =
        departmentFilter === "all" ||
        member.department === departmentFilter;
      const searchableContent = [
        member.name,
        member.email,
        member.role,
        member.department,
        member.location,
        member.skills.join(" "),
        member.projects.map((project) => project.name).join(" ")
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
    () => COLUMN_DEFINITIONS.filter((column) => visibleColumns[column.key]),
    [visibleColumns]
  );

  const columnLabels = useMemo(
    () => activeColumns.map((column) => column.label),
    [activeColumns]
  );

  const columnProps = useMemo(
    () =>
      activeColumns.map((column) => column.key) as ReadonlyArray<
        keyof TeamMember
      >,
    [activeColumns]
  );

  const sortableProps = useMemo(
    () =>
      activeColumns
        .filter((column) => SORTABLE_COLUMNS.includes(column.key))
        .map((column) => column.key) as ReadonlyArray<keyof TeamMember>,
    [activeColumns]
  );

  const totalResults = filteredMembers.length;
  const rangeStart = totalResults === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(page * itemsPerPage, totalResults);
  const activeColumnCount = activeColumns.length;
  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(Math.max(totalResults, 1) / itemsPerPage)
    );
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, itemsPerPage, totalResults]);

  useEffect(() => {
    if (!selectedMember) {
      return;
    }
    const stillVisible = sortedMembers.some(
      (member) => member.id === selectedMember.id
    );
    if (!stillVisible) {
      setSelectedMember(null);
    }
  }, [selectedMember, sortedMembers]);
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
    [setPage]
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
      setSelectedMember(member);
      setActivityNote(`Opened detail for ${member.name}`);
    },
    [ensureExpanded]
  );

  const handleAction = useCallback(
    (label: string, member: TeamMember) => {
      setActivityNote(`${label}: ${member.name}`);
      setSelectedMember(member);
      ensureExpanded(member.id);
    },
    [ensureExpanded]
  );

  const actionHandlers = useMemo(
    () =>
      ACTION_LABELS.map(
        (label) => (member: TeamMember) => handleAction(label, member)
      ),
    [handleAction]
  );
  const formatHeader = useCallback(
    (label: string, _prop: string, _index: number) => {
      const abbreviation = createHeaderAbbreviation(label);
      return (
        <div className="flex items-center gap-2">
          <span
            className={mergeClasses(
              "flex h-6 w-6 items-center justify-center rounded-full",
              "bg-zinc-200 text-xs font-semibold text-zinc-700",
              "dark:bg-neutral-700 dark:text-zinc-100"
            )}
          >
            {abbreviation}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
      );
    },
    []
  );

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
                  "mt-1 flex h-8 w-8 items-center justify-center",
                  "rounded-full border border-zinc-300 text-sm font-semibold",
                  "text-zinc-600 transition-colors hover:bg-zinc-200",
                  "dark:border-neutral-600 dark:text-zinc-200",
                  "dark:hover:bg-neutral-700"
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
                  {member.role} - {member.location} - {member.availability}
                </p>
              </div>
            </div>
            {isExpanded && (
              <div
                className={mergeClasses(
                  "rounded-lg border border-zinc-200 bg-white p-4",
                  "shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                )}
              >
                <div className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
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
                              ...PROJECT_STATUS_CLASS_MAP[project.status]
                            )}
                          >
                            {project.status} - {project.nextMilestone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-zinc-200 dark:bg-neutral-800">
                            <div
                              className="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                              style={{
                                width: formatPercentage(project.completion)
                              }}
                            />
                          </div>
                          <span className="font-semibold text-zinc-500 dark:text-zinc-300">
                            {formatPercentage(project.completion)}
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
              "dark:text-blue-300"
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
              "inline-flex items-center rounded-full px-3 py-1",
              "text-xs font-semibold",
              ...STATUS_CLASS_MAP[member.status]
            )}
          >
            {member.status.replace("-", " ")}
          </span>
        );
      }
      if (key === "skills") {
        const visibleSkills = member.skills.slice(0, 3);
        const extraCount = member.skills.length - visibleSkills.length;
        return (
          <div className="flex flex-wrap items-center gap-2">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className={mergeClasses(
                  "rounded-full border border-zinc-300 px-3 py-1",
                  "text-xs font-medium text-zinc-600",
                  "dark:border-neutral-600 dark:text-zinc-200"
                )}
              >
                {skill}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                +{extraCount} more
              </span>
            )}
          </div>
        );
      }
      return value;
    },
    [currencyFormatter, dateFormatter, expandedRows, toggleRowExpansion]
  );
  const tableClassNames = useMemo(
    () => ({
      container: mergeClasses(
        "rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl",
        "dark:border-neutral-700 dark:bg-neutral-950/80"
      ),
      scrollContainer: mergeClasses(
        "max-h-[65vh] overflow-auto",
        "scrollbar-thin scrollbar-thumb-zinc-300",
        "dark:scrollbar-thumb-neutral-700"
      ),
      table: "min-w-full",
      th: mergeClasses(
        "text-xs font-semibold uppercase tracking-wide text-zinc-500",
        "dark:text-zinc-400"
      ),
      tr: mergeClasses(
        "transition-colors",
        "hover:bg-zinc-100 dark:hover:bg-neutral-800/60"
      ),
      td: mergeClasses(
        "align-top text-sm text-zinc-700",
        "dark:text-zinc-200"
      ),
      interactive: {
        sortableCursor: "cursor-pointer",
        clickableCursor: "cursor-pointer",
        focusOutline: "ring-2 ring-blue-500"
      },
      pagination: {
        container: mergeClasses(
          "flex flex-wrap items-center justify-between gap-3 border-t",
          "border-zinc-200 pt-4 dark:border-neutral-700"
        ),
        button: mergeClasses(
          "rounded-full border border-zinc-300 px-4 py-2 text-sm",
          "font-medium text-zinc-700 transition-colors",
          "hover:bg-zinc-100 dark:border-neutral-600",
          "dark:text-zinc-200 dark:hover:bg-neutral-800"
        ),
        buttonDisabled: "opacity-40 cursor-not-allowed",
        pageInfo: mergeClasses(
          "text-sm font-medium text-zinc-600",
          "dark:text-zinc-300"
        ),
        navigation: {
          first: "",
          previous: "",
          next: "",
          last: ""
        }
      },
      cellExpansion: {
        container: mergeClasses(
          "rounded-lg border border-zinc-200 bg-zinc-50 p-3 shadow-sm",
          "dark:border-neutral-700 dark:bg-neutral-900"
        )
      }
    }),
    []
  );

  const cellExpansionConfig = useMemo(
    () => ({
      enabled: true,
      maxWidth: 320,
      behavior: "wrap" as const
    }),
    []
  );

  const accessibilityConfig = useMemo(
    () => ({
      focusStyles: "focus:outline-none focus:ring-2 focus:ring-blue-500",
      screenReaderLabels: {
        actions: "Row actions",
        pagination: "Table pagination controls",
        loading: "Loading team members"
      },
      keyboardNavigation: true
    }),
    []
  );

  const noContentProps = useMemo(
    () => ({
      text: "No team members match the current filters.",
      icon: <span aria-hidden="true">[]</span>,
      name: "Empty table state"
    }),
    []
  );

  const tableStyles = useMemo(
    () => ({
      scrollContainer: { borderRadius: "1.5rem" }
    }),
    []
  );
  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
      setPage(1);
    },
    [setPage]
  );

  const handleStatusFilterChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(event.target.value as "all" | TeamMember["status"]);
      setPage(1);
    },
    [setPage]
  );

  const handleDepartmentFilterChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setDepartmentFilter(
        event.target.value as "all" | TeamMember["department"]
      );
      setPage(1);
    },
    [setPage]
  );

  const handleItemsPerPageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(event.target.value));
      setPage(1);
    },
    [setPage]
  );
  return (
    <main
      className={mergeClasses(
        "min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100",
        "dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950"
      )}
    >
      <section
        className={mergeClasses(
          "mx-auto flex w-full max-w-6xl flex-col gap-8",
          "px-6 py-12 md:px-10 lg:px-16"
        )}
      >
        <header className="space-y-4">
          <div className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-neutral-700 dark:text-zinc-300">
            Advanced team intelligence
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Interactive talent table with master-detail insights
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Explore the full feature surface of nextjs-reusable-table: live search,
            column visibility controls, row actions, pagination, dark mode styling,
            and expandable master-detail rows.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Search teammates
              <input
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name, role, skill, or project"
                className={mergeClasses(
                  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3",
                  "text-sm shadow-sm transition-shadow focus:outline-none",
                  "focus:ring-2 focus:ring-blue-500 dark:border-neutral-700",
                  "dark:bg-neutral-900 dark:text-zinc-100"
                )}
                aria-label="Search team members"
              />
            </label>
          </div>
          <div className="md:col-span-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Status
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className={mergeClasses(
                  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3",
                  "text-sm shadow-sm focus:outline-none focus:ring-2",
                  "focus:ring-blue-500 dark:border-neutral-700",
                  "dark:bg-neutral-900 dark:text-zinc-100"
                )}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all"
                      ? "All statuses"
                      : option.replace("-", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="md:col-span-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Department
              <select
                value={departmentFilter}
                onChange={handleDepartmentFilterChange}
                className={mergeClasses(
                  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3",
                  "text-sm shadow-sm focus:outline-none focus:ring-2",
                  "focus:ring-blue-500 dark:border-neutral-700",
                  "dark:bg-neutral-900 dark:text-zinc-100"
                )}
              >
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all"
                      ? "All departments"
                      : option.replace("-", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="md:col-span-1">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Rows
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className={mergeClasses(
                  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3",
                  "text-sm shadow-sm focus:outline-none focus:ring-2",
                  "focus:ring-blue-500 dark:border-neutral-700",
                  "dark:bg-neutral-900 dark:text-zinc-100"
                )}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} / page
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div
          className={mergeClasses(
            "flex flex-wrap gap-3 rounded-2xl border border-dashed",
            "border-zinc-300 p-4 dark:border-neutral-700"
          )}
        >
          {COLUMN_DEFINITIONS.map((column) => {
            const isActive = visibleColumns[column.key];
            const isDisabled = isActive && activeColumnCount === 1;
            return (
              <label
                key={column.key}
                className={mergeClasses(
                  "flex items-center gap-2 rounded-full px-3 py-1",
                  isActive
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-600 dark:bg-neutral-800 dark:text-zinc-300"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-400 text-blue-600 focus:ring-blue-500"
                  checked={isActive}
                  onChange={() => toggleColumn(column.key)}
                  disabled={isDisabled}
                />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {column.label}
                </span>
              </label>
            );
          })}
          <button
            type="button"
            className={mergeClasses(
              "rounded-full border border-zinc-300 px-4 py-1 text-xs",
              "font-semibold text-zinc-600 transition-colors",
              "hover:bg-zinc-100 dark:border-neutral-600",
              "dark:text-zinc-200 dark:hover:bg-neutral-800"
            )}
            onClick={resetColumns}
          >
            Reset columns
          </button>
        </div>
        {activityNote && (
          <div
            className={mergeClasses(
              "flex items-center justify-between rounded-2xl border",
              "border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm",
              "dark:border-neutral-700 dark:bg-neutral-900"
            )}
            role="status"
          >
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {activityNote}
            </span>
            <button
              type="button"
              className={mergeClasses(
                "rounded-full border border-transparent px-3 py-1 text-xs",
                "font-semibold text-zinc-500 transition-colors",
                "hover:border-zinc-400 hover:text-zinc-700",
                "dark:text-zinc-300 dark:hover:border-neutral-600",
                "dark:hover:text-zinc-100"
              )}
              onClick={() => setActivityNote(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-zinc-600 dark:text-zinc-300">
            Showing {rangeStart === 0 ? "0" : `${rangeStart}-${rangeEnd}`} of {totalResults} teammates
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Search spans names, roles, skills, locations, and project titles.
          </p>
        </div>
        <TableComponent<TeamMember>
          columns={columnLabels}
          data={sortedMembers}
          props={columnProps}
          actions
          actionTexts={ACTION_LABELS}
          actionFunctions={actionHandlers}
          searchValue={searchTerm}
          enablePagination
          page={page}
          setPage={setPage}
          itemsPerPage={itemsPerPage}
          sortableProps={sortableProps}
          onSort={handleSort}
          formatValue={formatValue}
          formatHeader={formatHeader}
          noContentProps={noContentProps}
          showRemoveColumns
          rowOnClick={handleRowClick}
          customClassNames={tableClassNames}
          customStyles={tableStyles}
          cellExpansion={cellExpansionConfig}
          enableDarkMode
          accessibility={accessibilityConfig}
        />
        {selectedMember && (
          <aside
            className={mergeClasses(
              "rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl",
              "dark:border-neutral-700 dark:bg-neutral-900"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedMember.name}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedMember.role} - {selectedMember.department}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`mailto:${selectedMember.email}`}
                  className={mergeClasses(
                    "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold",
                    "text-white transition-colors hover:bg-blue-500"
                  )}
                >
                  Email
                </a>
                <button
                  type="button"
                  className={mergeClasses(
                    "rounded-full border border-zinc-300 px-4 py-2 text-sm",
                    "font-semibold text-zinc-700 transition-colors",
                    "hover:bg-zinc-100 dark:border-neutral-600",
                    "dark:text-zinc-200 dark:hover:bg-neutral-800"
                  )}
                  onClick={() => toggleRowExpansion(selectedMember.id)}
                >
                  Toggle details
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Mentor
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-200">
                  {selectedMember.mentor}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Availability
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-200">
                  {selectedMember.availability}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Active projects
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-200">
                  {selectedMember.projects.length}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Skills snapshot
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedMember.skills.map((skill) => (
                  <span
                    key={skill}
                    className={mergeClasses(
                      "rounded-full border border-zinc-300 px-3 py-1 text-xs",
                      "font-medium text-zinc-600 dark:border-neutral-600",
                      "dark:text-zinc-200"
                    )}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Project timeline
              </p>
              {selectedMember.projects.map((project) => (
                <div
                  key={project.name}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-neutral-700"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {project.name}
                    </p>
                    <p
                      className={mergeClasses(
                        "text-xs text-zinc-500 dark:text-zinc-400",
                        ...PROJECT_STATUS_CLASS_MAP[project.status]
                      )}
                    >
                      {project.status} - {project.nextMilestone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-zinc-200 dark:bg-neutral-800">
                      <div
                        className="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                        style={{ width: formatPercentage(project.completion) }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      {formatPercentage(project.completion)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}
