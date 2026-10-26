import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchGoods } from "../api/favoritApi";
import { extractBrands } from "../api/normalize";

export const fetchBrands = createAsyncThunk(
	"search/fetchBrands",
	async (number) => extractBrands(await fetchGoods({ number })),
);

const initialState = {
	query: "",
	brands: [],
	status: "idle",
	error: null,
	requestId: null,
};

const searchSlice = createSlice({
	name: "search",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchBrands.pending, (state, action) => {
				state.query = action.meta.arg;
				state.brands = [];
				state.status = "loading";
				state.error = null;
				state.requestId = action.meta.requestId;
			})
			.addCase(fetchBrands.fulfilled, (state, action) => {
				if (action.meta.requestId !== state.requestId) {
					return;
				}

				state.brands = action.payload;
				state.status = "succeeded";
			})
			.addCase(fetchBrands.rejected, (state, action) => {
				if (action.meta.requestId !== state.requestId) {
					return;
				}

				state.status = "failed";
				state.error = action.error.message;
			});
	},
});

export default searchSlice.reducer;
