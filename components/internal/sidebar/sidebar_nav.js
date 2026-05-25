import {
  Archive,
  BarChart3,
  BookTemplate,
  FileText,
  Folder,
  Inbox,
  LayoutDashboard,
  Settings,
  Share2,
} from "lucide-react";

export const formNavItems = [
  { id: "Overview", title: "Overview", Icon: LayoutDashboard },
  { id: "Forms", title: "Forms", Icon: FileText },
  { id: "Responses", title: "Responses", Icon: Inbox },
  { id: "Analytics", title: "Analytics", Icon: BarChart3 },
  { id: "Templates", title: "Templates", Icon: BookTemplate },
  { id: "Folders", title: "Folders", Icon: Folder },
  { id: "Shared", title: "Shared", Icon: Share2 },
  { id: "Archived", title: "Archived", Icon: Archive },
  { id: "Settings", title: "Settings", Icon: Settings },
];
