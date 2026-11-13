import { createContext, useContext } from 'react'

// Lo que necesitan las pantallas de Trabajo para los proyectos compartidos (ver useSharedProjects)
export const SharedCtx = createContext({ meta: () => null, create: async () => null, saveVersion: async () => {}, restore: async () => {}, invite: async () => {}, me: null, color: () => null, error: '' })
export const useShared = () => useContext(SharedCtx)
