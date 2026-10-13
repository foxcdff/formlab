import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { surveysApi } from '../features/surveys/surveysApi'

export const store = configureStore({
  reducer: { [surveysApi.reducerPath]: surveysApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(surveysApi.middleware),
})
setupListeners(store.dispatch)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch