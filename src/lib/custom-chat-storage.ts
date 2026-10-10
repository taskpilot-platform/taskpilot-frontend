import type { ProjectChatMessage } from "@/types/collab";

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
  members: CustomGroupMember[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

const STORAGE_KEY_GROUPS = "taskpilot_custom_group_chats";
const STORAGE_KEY_MESSAGES_PREFIX = "taskpilot_custom_chat_msg_";

export const customChatStorage = {
  getGroups: (currentUserId?: number | null): CustomGroupChat[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (!raw) {
        // Provide 2 realistic seed groups for MS Teams collaboration
        const seedGroups: CustomGroupChat[] = [
          {
            id: "grp-dev-leads",
            name: "Team Kỹ Thuật Core",
            description: "Thảo luận kiến trúc hệ thống, đồng bộ tiến độ Microservices & LiveKit",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            createdBy: currentUserId || 1,
            members: [
              {
                id: currentUserId || 1,
                name: "Bạn (Tôi)",
                email: "me@taskpilot.local",
                role: "OWNER",
              },
              {
                id: 991,
                name: "Alex Rivera",
                email: "alex.rivera@taskpilot.local",
                role: "ADMIN",
              },
              {
                id: 992,
                name: "Minh Tran",
                email: "minh.tran@taskpilot.local",
                role: "MEMBER",
              },
            ],
            lastMessage: "Kiến trúc LiveKit SFU đã hoàn tất tích hợp sang STOMP.",
            lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
            unreadCount: 0,
          },
          {
            id: "grp-product-board",
            name: "Ban Điều Hành & Product",
            description: "Trao đổi chiến lược sản phẩm, Roadmap Sprint và phản hồi người dùng",
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            createdBy: 991,
            members: [
              {
                id: currentUserId || 1,
                name: "Bạn (Tôi)",
                email: "me@taskpilot.local",
                role: "MEMBER",
              },
              {
                id: 993,
                name: "Sarah Chen",
                email: "sarah.chen@taskpilot.local",
                role: "OWNER",
              },
            ],
            lastMessage: "Kế hoạch ra mắt phiên bản v2.0 được phê duyệt.",
            lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
            unreadCount: 1,
          },
        ];
        localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(seedGroups));
        return seedGroups;
      }
      return JSON.parse(raw) as CustomGroupChat[];
    } catch {
      return [];
    }
  },

  createGroup: (
    name: string,
    description: string,
    members: CustomGroupMember[],
    createdBy: number
  ): CustomGroupChat => {
    const existing = customChatStorage.getGroups(createdBy);
    const newGroup: CustomGroupChat = {
      id: `grp-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      createdBy,
      members,
      lastMessage: "Nhóm trò chuyện đã được tạo",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };
    const updated = [newGroup, ...existing];
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(updated));

    // Save initial system message
    const welcomeMsg: ProjectChatMessage = {
      id: Date.now(),
      projectId: -1,
      senderId: createdBy,
      senderName: "Hệ thống",
      content: `🎉 Nhóm "${newGroup.name}" đã được tạo. Hãy bắt đầu cuộc trò chuyện!`,
      messageType: "SYSTEM",
      createdAt: new Date().toISOString(),
    };
    customChatStorage.saveMessages(newGroup.id, [welcomeMsg]);

    return newGroup;
  },

  getMessages: (groupId: string): ProjectChatMessage[] => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_MESSAGES_PREFIX}${groupId}`);
      if (!raw) {
        // Return default greeting message
        return [
          {
            id: 1,
            projectId: -1,
            senderId: 991,
            senderName: "Alex Rivera",
            content: "Chào mọi người! Nhóm đã được kết nối theo mô hình MS Teams.",
            messageType: "TEXT",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ];
      }
      return JSON.parse(raw) as ProjectChatMessage[];
    } catch {
      return [];
    }
  },

  saveMessages: (groupId: string, messages: ProjectChatMessage[]) => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_MESSAGES_PREFIX}${groupId}`,
        JSON.stringify(messages)
      );
    } catch {
      // ignore storage quota issues
    }
  },

  sendMessage: (
    groupId: string,
    content: string,
    senderId: number,
    senderName: string,
    senderAvatarUrl?: string
  ): ProjectChatMessage => {
    const current = customChatStorage.getMessages(groupId);
    const newMsg: ProjectChatMessage = {
      id: Date.now(),
      projectId: -1,
      senderId,
      senderName,
      senderAvatarUrl,
      content,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
    };
    const updated = [...current, newMsg];
    customChatStorage.saveMessages(groupId, updated);

    // Update group last message
    try {
      const groups = customChatStorage.getGroups(senderId);
      const groupIdx = groups.findIndex((g) => g.id === groupId);
      if (groupIdx !== -1) {
        groups[groupIdx].lastMessage = content;
        groups[groupIdx].lastMessageAt = newMsg.createdAt;
        localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
      }
    } catch {
      // ignore
    }

    return newMsg;
  },
};
