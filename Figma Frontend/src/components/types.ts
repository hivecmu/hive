export interface FileItem {
  id: string;
  title: string;
  type: "doc" | "sheet" | "pdf" | "image" | "code" | "presentation";
  source: "drive" | "dropbox" | "onedrive" | "notion" | "github";
  channel: string;
  subgroup: string;
  tags: string[];
  modifiedDate: string;
  size: string;
  locations: string[];
  versions: number;
  contentHash: string;
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  status: "unlinked" | "linking" | "linked" | "reauth";
}

export interface Channel {
  id: string;
  name: string;
  subgroups: Subgroup[];
}

export interface Subgroup {
  id: string;
  name: string;
  fileCount: number;
}
