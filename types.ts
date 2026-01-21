
export type Role = 'Admin' | 'User';

export type ProgramType = '小教' | '中教' | '幼教' | '中小合流';

export enum ApplicationStatus {
  PENDING = '待審核',
  APPROVED = '已通過',
  REJECTED = '已駁回'
}

export type CourseCategory = '專門' | '專業';

export interface Attachment {
  name: string;
  data: string; // Base64
}

export interface User {
  loginId: string;     // 登入時輸入的帳號 (如: admin, user1)
  username: string;    // 系統顯示的名稱 (如: 管理員, 王小明)
  role: Role;
  email?: string;      // 電子郵件
  studentId?: string;  // 學號
  department?: string; // 系所
  program?: ProgramType | string;    // 學程
  profileImage?: string; // 大頭照 (Base64)
  password?: string;   // 登入密碼
  isFirstLogin?: boolean; // 是否為首次登入 (強制改密碼)
}

export interface Application {
  id: string;
  username: string;
  courseName: string;            // 課程名稱
  equivalentCourseName: string;  // 抵免課程名稱
  courseCredits: string;         // 修課學分
  waiverCredits: string;         // 抵免課程學分
  semesterTaken: string;         // 修課學期
  waiverSemester: string;        // 抵免學期
  offeringUniversity: string;    // 修課學校
  description: string;           // 備註說明
  attachments: Attachment[];     // 多附件支援
  status: ApplicationStatus;
  createdAt: string;
  courseCategory?: CourseCategory; // 課程類別：專門 / 專業
}

export interface Statistics {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}
