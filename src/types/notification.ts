// src/types/notification.ts
import { ToastProps } from "@/components/ui/toast";
import React from "react";

export interface AppNotification {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  timestamp: Date;
  read: boolean;
  variant?: ToastProps["variant"];
  action?: React.ReactNode; // If toasts have actions, we might want to show them
}