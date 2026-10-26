import { configureStore } from "@reduxjs/toolkit";
import offers from "./offersSlice";
import search from "./searchSlice";

export const store = configureStore({
	reducer: { search, offers },
});
