import { isCustomChatDemoEnabled } from "@/lib/features";
import type { ProjectChatMessage } from "@/types/collab";

export const CUSTOM_CHAT_SCHEMA_VERSION = 2;

export interface CustomGroupMember {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export interface CustomGroupChat {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  createdBy: number;
  ownerUserId: number;
  schemaVersion: number;
  isLocalDemo?: boolean;
  members: CustomGroupMember[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface CustomGroupDemoMessage extends ProjectChatMessage {
  ownerUserId?: number;
  schemaVersion?: number;
}

const SCOPED_GROUPS_KEY_PREFIX = "taskpilot_custom_group_chats_v2_u_";
const SCOPED_MESSAGES_KEY_PREFIX = "taskpilot_custom_chat_msg_v2_u_";

function normalizeUserId(userId?: number | null): number | null {
  if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) {
    return null;
  }
  return userId;
}

function getScopedGroupsKey(userId: number): string {
  return `${SCOPED_GROUPS_KEY_PREFIX}${userId}`;
}

function getScopedMessagesKey(userId: number, groupId: string): string {
  return `${SCOPED_MESSAGES_KEY_PREFIX}${userId}_g_${groupId}`;
}

export const customChatStorage = {
  getGroups: (currentUserId?: number | null): CustomGroupChat[] => {
    if (!isCustomChatDemoEnabled()) {
      return [];
    }
    const uid = normalizeUserId(currentUserId);
    if (!uid) {
      return [];
    }

    try {
      const raw = localStorage.getItem(getScopedGroupsKey(uid));
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (item): item is CustomGroupChat =>
          Boolean(item) &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          item.schemaVersion === CUSTOM_CHAT_SCHEMA_VERSION &&
          item.ownerUserId === uid,
      );
    } catch {
      return [];
    }
  },

  createGroup: (
    name: string,
    description: string,
    members: CustomGroupMember[],
    createdBy?: number | null,
  ): CustomGroupChat => {
    if (!isCustomChatDemoEnabled()) {
      throw new Error("Custom group chat demo is disabled.");
    }
    const uid = normalizeUserId(createdBy);
    if (!uid) {
      throw new Error("Authenticated user ID is required for local demo groups.");
    }

    const existing = customChatStorage.getGroups(uid);
    const nowIso = new Date().toISOString();
    const newGroup: CustomGroupChat = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: nowIso,
      createdBy: uid,
      ownerUserId: uid,
      schemaVersion: CUSTOM_CHAT_SCHEMA_VERSION,
      isLocalDemo: true,
      members,
      lastMessage: "Local demo group created",
      lastMessageAt: nowIso,
      unreadCount: 0,
    };
    const updated = [newGroup, ...existing];
    localStorage.setItem(getScopedGroupsKey(uid), JSON.stringify(updated));

    const welcomeMsg: CustomGroupDemoMessage = {
      id: Date.now(),
      projectId: -1,
      senderId: uid,
      senderName: "Local Demo",
      content: `Local demo group "${newGroup.name}" created. Messages stay in this browser only and are not sent over STOMP.`,
      messageType: "SYSTEM",
      createdAt: nowIso,
      ownerUserId: uid,
      schemaVersion: CUSTOM_CHAT_SCHEMA_VERSION,
    };
    customChatStorage.saveMessages(newGroup.id, [welcomeMsg], uid);

    return newGroup;
  },

  getMessages: (
    groupId: string,
    currentUserId?: number | null,
  ): CustomGroupDemoMessage[] => {
    if (!isCustomChatDemoEnabled()) {
      return [];
    }
    const uid = normalizeUserId(currentUserId);
    if (!uid || !groupId) {
      return [];
    }

    const ownsGroup = customChatStorage.getGroups(uid).some((g) => g.id === groupId);
    if (!ownsGroup) {
      return [];
    }

    try {
      const raw = localStorage.getItem(getScopedMessagesKey(uid, groupId));
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (msg): msg is CustomGroupDemoMessage =>
          Boolean(msg) &&
          typeof msg.content === "string" &&
          msg.schemaVersion === CUSTOM_CHAT_SCHEMA_VERSION &&
          msg.ownerUserId === uid,
      );
    } catch {
      return [];
    }
  },

  saveMessages: (
    groupId: string,
    messages: ProjectChatMessage[],
    currentUserId?: number | null,
  ) => {
    if (!isCustomChatDemoEnabled()) {
      return;
    }
    const uid = normalizeUserId(currentUserId);
    if (!uid || !groupId) {
      return;
    }

    try {
      const scopedMessages: CustomGroupDemoMessage[] = messages.map((msg) => ({
        ...msg,
        ownerUserId: uid,
        schemaVersion: CUSTOM_CHAT_SCHEMA_VERSION,
      }));
      localStorage.setItem(
        getScopedMessagesKey(uid, groupId),
        JSON.stringify(scopedMessages),
      );
    } catch {
      // ignore storage quota issues
    }
  },

  sendMessage: (
    groupId: string,
    content: string,
    senderId: number | null | undefined,
    senderName: string,
    senderAvatarUrl?: string,
  ): CustomGroupDemoMessage => {
    if (!isCustomChatDemoEnabled()) {
      throw new Error("Custom group chat demo is disabled.");
    }
    const uid = normalizeUserId(senderId);
    if (!uid) {
      throw new Error("Authenticated user ID is required for local demo messages.");
    }

    const groups = customChatStorage.getGroups(uid);
    const groupIdx = groups.findIndex((g) => g.id === groupId);
    if (groupIdx === -1) {
      throw new Error("Custom group not found for current user.");
    }

    const current = customChatStorage.getMessages(groupId, uid);
    const newMsg: CustomGroupDemoMessage = {
      id: Date.now(),
      projectId: -1,
      senderId: uid,
      senderName,
      senderAvatarUrl,
      content,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
      ownerUserId: uid,
      schemaVersion: CUSTOM_CHAT_SCHEMA_VERSION,
    };
    const updated = [...current, newMsg];
    customChatStorage.saveMessages(groupId, updated, uid);

    try {
      groups[groupIdx].lastMessage = content;
      groups[groupIdx].lastMessageAt = newMsg.createdAt;
      localStorage.setItem(getScopedGroupsKey(uid), JSON.stringify(groups));
    } catch {
      // ignore
    }

    return newMsg;
  },
};
