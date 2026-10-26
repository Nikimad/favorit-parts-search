import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchGoods } from "../api/favoritApi";
import { buildOffers } from "../api/normalize";
import { fetchBrands } from "./searchSlice";

export const fetchOffers = createAsyncThunk(
	"offers/fetchOffers",
	async ({ number, brand }) => buildOffers(await fetchGoods({ number, brand })),
);

const initialState = {
	brand: null,
	original: null,
	analogues: [],
	status: "idle",
	error: null,
	requestId: null,
};

const offersSlice = createSlice({
	name: "offers",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			// Новый поиск сбрасывает этап 2, обнулённый requestId заодно отбрасывает ответ, который ещё в пути
			.addCase(fetchBrands.pending, () => initialState)
			.addCase(fetchOffers.pending, (state, action) => {
				state.brand = action.meta.arg.brand;
				state.original = null;
				state.analogues = [];
				state.status = "loading";
				state.error = null;
				state.requestId = action.meta.requestId;
			})
			.addCase(fetchOffers.fulfilled, (state, action) => {
				if (action.meta.requestId !== state.requestId) {
					return;
				}

				state.original = action.payload.original;
				state.analogues = action.payload.analogues;
				state.status = "succeeded";
			})
			.addCase(fetchOffers.rejected, (state, action) => {
				if (action.meta.requestId !== state.requestId) {
					return;
				}

				state.status = "failed";
				state.error = action.error.message;
			});
	},
});

export default offersSlice.reducer;
