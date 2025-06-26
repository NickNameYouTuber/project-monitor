// Temporary type declarations for MUI components
// These will be replaced when you install the actual @mui packages

declare module '@mui/material' {
  export const Box: any;
  export const Container: any;
  export const Typography: any;
  export const Tabs: any;
  export const Tab: any;
  export const Grid: any;
  export const Paper: any;
  export const Button: any;
  export const Chip: any;
  export const CircularProgress: any;
  export const Alert: any;
  export const List: any;
  export const ListItem: any;
  export const ListItemIcon: any;
  export const ListItemText: any;
  export const Breadcrumbs: any;
  export const Link: any;
  export const Dialog: any;
  export const DialogTitle: any;
  export const DialogContent: any;
  export const DialogActions: any;
  export const Divider: any;
}

declare module '@mui/icons-material' {
  export const Code: any;
  export const History: any;
  export const Group: any;
  export const Link: any;
  export const Visibility: any;
  export const VisibilityOff: any;
  export const Folder: any;
  export const InsertDriveFile: any;
  export const NavigateNext: any;
  export const ArrowRight: any;
  export const Add: any;
  export const Remove: any;
  export const CreateOutlined: any;
}

declare module 'date-fns' {
  export function format(date: Date, format: string, options?: any): string;
}

declare module 'date-fns/locale' {
  export const ru: any;
}

declare module 'react-syntax-highlighter' {
  export const Prism: any;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: any;
}
