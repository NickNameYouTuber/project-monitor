import type { Project } from "../types";

// Storage keys
const USER_KEY_PREFIX = 'projects_';
const TEAM_KEY_PREFIX = 'teamMembers_';
const DARK_MODE_KEY = 'darkMode';

// Load projects from local storage
export const loadProjects = (userId: string): Project[] => {
  const key = `${USER_KEY_PREFIX}${userId}`;
  const storedData = localStorage.getItem(key);
  return storedData ? JSON.parse(storedData) : [];
};

// Save projects to local storage
export const saveProjects = (userId: string, projects: Project[]): void => {
  const key = `${USER_KEY_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(projects));
};

// Load team members from local storage
export const loadTeamMembers = (userId: string): string[] => {
  const key = `${TEAM_KEY_PREFIX}${userId}`;
  const storedData = localStorage.getItem(key);
  return storedData ? JSON.parse(storedData) : ['You', 'Vasya'];
};

// Save team members to local storage
export const saveTeamMembers = (userId: string, members: string[]): void => {
  const key = `${TEAM_KEY_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(members));
};

// Get dark mode setting
export const getDarkMode = (): boolean => {
  return localStorage.getItem(DARK_MODE_KEY) === 'true';
};

// Save dark mode setting
export const saveDarkMode = (isDarkMode: boolean): void => {
  localStorage.setItem(DARK_MODE_KEY, isDarkMode.toString());
};
