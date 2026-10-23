import { configureStore } from '@reduxjs/toolkit'
import search from './searchSlice'
import offers from './offersSlice'

export const store = configureStore({
  reducer: { search, offers },
})
