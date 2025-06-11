// ==========================================
// Imports
// ==========================================
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	FlatList,
	Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, yAxisSides } from 'react-native-gifted-charts';

// ==========================================
// Type Definitions
// ==========================================
interface Transaction {
	id: string;
	description: string;
	amount: number;
	type: 'income' | 'expense';
	category: string;
	date: string;
	aiFlag?: string; // Optional: AI-generated flag like 'UNUSUAL', 'TIP'
}

interface AISuggestion {
	id: string;
	title: string;
	tip: string;
	actionText?: string; // e.g., "Review Subscriptions"
	actionType?: string; // e.g., "SUBSCRIPTION_REVIEW"
}

interface StockData {
	date: string;
	amount: number;
}

interface StockChartProps {
	data: { value: number; date: string; label?: string; labelTextStyle?: any }[];
	maxValue: number;
	spacing: number;
	width: number;
	setTotalAmount: (value: number | null) => void;
}

// ==========================================
// Mock Data
// ==========================================
const ptData = [
	{ value: 160, date: '1 Apr 2022' },
	{ value: 180, date: '2 Apr 2022' },
	{ value: 190, date: '3 Apr 2022' },
	{ value: 180, date: '4 Apr 2022' },
	{ value: 140, date: '5 Apr 2022' },
	{ value: 145, date: '6 Apr 2022' },
	{ value: 160, date: '7 Apr 2022' },
	{ value: 200, date: '8 Apr 2022' },

	{ value: 220, date: '9 Apr 2022' },
	{
		value: 240,
		date: '10 Apr 2022',
		label: '10 Apr',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 280, date: '11 Apr 2022' },
	{ value: 260, date: '12 Apr 2022' },
	{ value: 340, date: '13 Apr 2022' },
	{ value: 385, date: '14 Apr 2022' },
	{ value: 280, date: '15 Apr 2022' },
	{ value: 390, date: '16 Apr 2022' },

	{ value: 370, date: '17 Apr 2022' },
	{ value: 285, date: '18 Apr 2022' },
	{ value: 295, date: '19 Apr 2022' },
	{
		value: 300,
		date: '20 Apr 2022',
		label: '20 Apr',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 280, date: '21 Apr 2022' },
	{ value: 295, date: '22 Apr 2022' },
	{ value: 260, date: '23 Apr 2022' },
	{ value: 255, date: '24 Apr 2022' },

	{ value: 190, date: '25 Apr 2022' },
	{ value: 220, date: '26 Apr 2022' },
	{ value: 205, date: '27 Apr 2022' },
	{ value: 230, date: '28 Apr 2022' },
	{ value: 210, date: '29 Apr 2022' },
	{
		value: 200,
		date: '30 Apr 2022',
		label: '30 Apr',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 240, date: '1 May 2022' },
	{ value: 250, date: '2 May 2022' },
	{ value: 280, date: '3 May 2022' },
	{ value: 250, date: '4 May 2022' },
	{ value: 210, date: '5 May 2022' },
];

// NVDA Stock Data - Date and Open Price only
const NVDA_DATA = [
	{ value: 143.25, date: '06/10/2025' },
	{ value: 143.19, date: '06/09/2025' },
	{ value: 142.85, date: '06/08/2025' },
	{ value: 142.51, date: '06/06/2025' },
	{ value: 142.17, date: '06/05/2025' },
	{ value: 142.19, date: '06/04/2025' },
	{ value: 138.78, date: '06/03/2025' },
	{ value: 135.49, date: '06/02/2025' },
	{ value: 138.72, date: '05/30/2025' },
	{ value: 142.25, date: '05/29/2025' },
	{ value: 136.03, date: '05/28/2025' },
	{ value: 134.15, date: '05/27/2025' },
	{ value: 130.0, date: '05/23/2025' },
	{ value: 132.23, date: '05/22/2025' },
	{ value: 133.06, date: '05/21/2025' },
	{ value: 134.29, date: '05/20/2025' },
	{ value: 132.39, date: '05/19/2025' },
	{ value: 136.22, date: '05/16/2025' },
	{ value: 134.3, date: '05/15/2025' },
	{ value: 133.2, date: '05/14/2025' },
	{ value: 124.98, date: '05/13/2025' },
	{ value: 121.97, date: '05/12/2025' },
	{ value: 117.35, date: '05/09/2025' },
	{ value: 118.25, date: '05/08/2025' },
	{ value: 113.05, date: '05/07/2025' },
	{ value: 111.48, date: '05/06/2025' },
	{ value: 112.91, date: '05/05/2025' },
	{ value: 114.18, date: '05/02/2025' },
	{
		value: 113.08,
		date: '05/01/2025',
		label: 'May',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 104.47, date: '04/30/2025' },
	{ value: 107.67, date: '04/29/2025' },
	{ value: 109.69, date: '04/28/2025' },
	{ value: 106.85, date: '04/25/2025' },
	{ value: 103.48, date: '04/24/2025' },
	{ value: 104.52, date: '04/23/2025' },
	{ value: 98.78, date: '04/22/2025' },
	{ value: 98.77, date: '04/21/2025' },
	{ value: 104.45, date: '04/17/2025' },
	{ value: 104.55, date: '04/16/2025' },
	{ value: 110.97, date: '04/15/2025' },
	{ value: 114.11, date: '04/14/2025' },
	{ value: 108.5, date: '04/11/2025' },
	{ value: 109.37, date: '04/10/2025' },
	{ value: 98.89, date: '04/09/2025' },
	{ value: 103.81, date: '04/08/2025' },
	{ value: 87.46, date: '04/07/2025' },
	{ value: 98.91, date: '04/04/2025' },
	{ value: 103.51, date: '04/03/2025' },
	{ value: 107.29, date: '04/02/2025' },
	{
		value: 108.52,
		date: '04/01/2025',
		label: 'Apr',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 105.13, date: '03/31/2025' },
	{ value: 111.49, date: '03/28/2025' },
	{ value: 111.35, date: '03/27/2025' },
	{ value: 118.73, date: '03/26/2025' },
	{ value: 120.55, date: '03/25/2025' },
	{ value: 119.88, date: '03/24/2025' },
	{ value: 116.94, date: '03/21/2025' },
	{ value: 116.55, date: '03/20/2025' },
	{ value: 117.27, date: '03/19/2025' },
	{ value: 118.0, date: '03/18/2025' },
	{ value: 122.74, date: '03/17/2025' },
	{ value: 118.61, date: '03/14/2025' },
	{ value: 117.03, date: '03/13/2025' },
	{ value: 114.12, date: '03/12/2025' },
	{ value: 106.99, date: '03/11/2025' },
	{ value: 109.9, date: '03/10/2025' },
	{ value: 111.25, date: '03/07/2025' },
	{ value: 113.53, date: '03/06/2025' },
	{ value: 117.58, date: '03/05/2025' },
	{ value: 110.65, date: '03/04/2025' },
	{ value: 123.51, date: '03/03/2025' },
	{ value: 118.02, date: '02/28/2025' },
	{ value: 135.0, date: '02/27/2025' },
	{ value: 129.99, date: '02/26/2025' },
	{ value: 129.98, date: '02/25/2025' },
	{ value: 136.56, date: '02/24/2025' },
	{ value: 140.04, date: '02/21/2025' },
	{ value: 140.03, date: '02/20/2025' },
	{ value: 139.51, date: '02/19/2025' },
	{ value: 141.27, date: '02/18/2025' },
	{ value: 136.48, date: '02/14/2025' },
	{ value: 131.56, date: '02/13/2025' },
	{ value: 130.02, date: '02/12/2025' },
	{ value: 132.58, date: '02/11/2025' },
	{ value: 130.09, date: '02/10/2025' },
	{ value: 129.22, date: '02/07/2025' },
	{ value: 127.42, date: '02/06/2025' },
	{ value: 121.76, date: '02/05/2025' },
	{ value: 116.96, date: '02/04/2025' },
	{ value: 114.75, date: '02/03/2025' },
	{ value: 123.78, date: '01/31/2025' },
	{ value: 123.1, date: '01/30/2025' },
	{ value: 126.5, date: '01/29/2025' },
	{ value: 121.81, date: '01/28/2025' },
	{ value: 124.8, date: '01/27/2025' },
	{ value: 148.37, date: '01/24/2025' },
	{ value: 145.05, date: '01/23/2025' },
	{ value: 144.66, date: '01/22/2025' },
	{ value: 139.16, date: '01/21/2025' },
	{ value: 136.69, date: '01/17/2025' },
	{ value: 138.64, date: '01/16/2025' },
	{ value: 133.65, date: '01/15/2025' },
	{ value: 136.05, date: '01/14/2025' },
	{ value: 129.99, date: '01/13/2025' },
	{ value: 137.45, date: '01/10/2025' },
	{ value: 142.58, date: '01/08/2025' },
	{ value: 153.03, date: '01/07/2025' },
	{ value: 148.59, date: '01/06/2025' },
	{ value: 140.01, date: '01/03/2025' },
	{ value: 136.0, date: '01/02/2025' },
	{
		value: 138.03,
		date: '12/31/2024',
		label: 'Dec',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 134.83, date: '12/30/2024' },
	{ value: 138.55, date: '12/27/2024' },
	{ value: 139.7, date: '12/26/2024' },
	{ value: 140.0, date: '12/24/2024' },
	{ value: 136.28, date: '12/23/2024' },
	{ value: 129.81, date: '12/20/2024' },
	{ value: 131.76, date: '12/19/2024' },
	{ value: 133.86, date: '12/18/2024' },
	{ value: 129.09, date: '12/17/2024' },
	{ value: 134.18, date: '12/16/2024' },
	{ value: 138.94, date: '12/13/2024' },
	{ value: 137.08, date: '12/12/2024' },
	{ value: 137.36, date: '12/11/2024' },
	{ value: 139.01, date: '12/10/2024' },
	{ value: 138.97, date: '12/09/2024' },
	{ value: 144.6, date: '12/06/2024' },
	{ value: 145.11, date: '12/05/2024' },
	{ value: 142.0, date: '12/04/2024' },
	{ value: 138.26, date: '12/03/2024' },
	{ value: 138.83, date: '12/02/2024' },
	{ value: 136.78, date: '11/29/2024' },
	{ value: 135.01, date: '11/27/2024' },
	{ value: 137.7, date: '11/26/2024' },
	{ value: 141.99, date: '11/25/2024' },
	{ value: 145.93, date: '11/22/2024' },
	{ value: 149.35, date: '11/21/2024' },
	{ value: 147.41, date: '11/20/2024' },
	{ value: 141.32, date: '11/19/2024' },
	{ value: 139.5, date: '11/18/2024' },
	{ value: 144.87, date: '11/15/2024' },
	{ value: 147.64, date: '11/14/2024' },
	{ value: 149.07, date: '11/13/2024' },
	{ value: 146.78, date: '11/12/2024' },
	{ value: 148.68, date: '11/11/2024' },
	{ value: 148.77, date: '11/08/2024' },
	{ value: 146.39, date: '11/07/2024' },
	{ value: 142.96, date: '11/06/2024' },
	{ value: 137.45, date: '11/05/2024' },
	{ value: 137.21, date: '11/04/2024' },
	{
		value: 134.7,
		date: '11/01/2024',
		label: 'Nov',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 137.6, date: '10/31/2024' },
	{ value: 139.54, date: '10/30/2024' },
	{ value: 140.29, date: '10/29/2024' },
	{ value: 143.0, date: '10/28/2024' },
	{ value: 140.93, date: '10/25/2024' },
	{ value: 140.82, date: '10/24/2024' },
	{ value: 142.03, date: '10/23/2024' },
	{ value: 142.91, date: '10/22/2024' },
	{ value: 138.13, date: '10/21/2024' },
	{ value: 138.67, date: '10/18/2024' },
	{ value: 139.34, date: '10/17/2024' },
	{ value: 133.98, date: '10/16/2024' },
	{ value: 137.87, date: '10/15/2024' },
	{ value: 136.47, date: '10/14/2024' },
	{ value: 134.01, date: '10/11/2024' },
	{ value: 131.91, date: '10/10/2024' },
	{ value: 134.11, date: '10/09/2024' },
	{ value: 130.26, date: '10/08/2024' },
	{ value: 124.99, date: '10/07/2024' },
	{ value: 124.94, date: '10/04/2024' },
	{ value: 120.92, date: '10/03/2024' },
	{ value: 116.44, date: '10/02/2024' },
	{
		value: 121.77,
		date: '10/01/2024',
		label: 'Oct',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 118.31, date: '09/30/2024' },
	{ value: 123.97, date: '09/27/2024' },
	{ value: 126.8, date: '09/26/2024' },
	{ value: 122.02, date: '09/25/2024' },
	{ value: 116.52, date: '09/24/2024' },
	{ value: 116.55, date: '09/23/2024' },
	{ value: 117.06, date: '09/20/2024' },
	{ value: 117.35, date: '09/19/2024' },
	{ value: 115.89, date: '09/18/2024' },
	{ value: 118.17, date: '09/17/2024' },
	{ value: 116.79, date: '09/16/2024' },
	{ value: 119.08, date: '09/13/2024' },
	{ value: 116.84, date: '09/12/2024' },
	{ value: 109.39, date: '09/11/2024' },
	{ value: 107.81, date: '09/10/2024' },
	{ value: 104.88, date: '09/09/2024' },
	{ value: 108.04, date: '09/06/2024' },
	{ value: 104.99, date: '09/05/2024' },
	{ value: 105.41, date: '09/04/2024' },
	{ value: 116.01, date: '09/03/2024' },
	{ value: 119.53, date: '08/30/2024' },
	{ value: 121.36, date: '08/29/2024' },
	{ value: 128.12, date: '08/28/2024' },
	{ value: 125.05, date: '08/27/2024' },
	{ value: 129.57, date: '08/26/2024' },
	{ value: 125.86, date: '08/23/2024' },
	{ value: 130.02, date: '08/22/2024' },
	{ value: 127.32, date: '08/21/2024' },
	{ value: 128.4, date: '08/20/2024' },
	{ value: 124.28, date: '08/19/2024' },
	{ value: 121.94, date: '08/16/2024' },
	{ value: 118.76, date: '08/15/2024' },
	{ value: 118.53, date: '08/14/2024' },
	{ value: 112.44, date: '08/13/2024' },
	{ value: 106.32, date: '08/12/2024' },
	{ value: 105.64, date: '08/09/2024' },
	{ value: 102.0, date: '08/08/2024' },
	{ value: 107.81, date: '08/07/2024' },
	{ value: 103.84, date: '08/06/2024' },
	{ value: 92.06, date: '08/05/2024' },
	{ value: 103.76, date: '08/02/2024' },
	{
		value: 117.53,
		date: '08/01/2024',
		label: 'Aug',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 112.9, date: '07/31/2024' },
	{ value: 111.52, date: '07/30/2024' },
	{ value: 113.69, date: '07/29/2024' },
	{ value: 116.19, date: '07/26/2024' },
	{ value: 113.04, date: '07/25/2024' },
	{ value: 119.17, date: '07/24/2024' },
	{ value: 122.78, date: '07/23/2024' },
	{ value: 120.35, date: '07/22/2024' },
	{ value: 120.35, date: '07/19/2024' },
	{ value: 121.85, date: '07/18/2024' },
	{ value: 121.35, date: '07/17/2024' },
	{ value: 128.44, date: '07/16/2024' },
	{ value: 130.56, date: '07/15/2024' },
	{ value: 128.26, date: '07/12/2024' },
	{ value: 135.75, date: '07/11/2024' },
	{ value: 134.03, date: '07/10/2024' },
	{ value: 130.35, date: '07/09/2024' },
	{ value: 127.49, date: '07/08/2024' },
	{ value: 127.38, date: '07/05/2024' },
	{ value: 121.66, date: '07/03/2024' },
	{ value: 121.13, date: '07/02/2024' },
	{
		value: 123.47,
		date: '07/01/2024',
		label: 'Jul',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 124.58, date: '06/28/2024' },
	{ value: 124.1, date: '06/27/2024' },
	{ value: 126.13, date: '06/26/2024' },
	{ value: 121.2, date: '06/25/2024' },
	{ value: 123.24, date: '06/24/2024' },
	{ value: 127.12, date: '06/21/2024' },
	{ value: 139.8, date: '06/20/2024' },
	{ value: 131.14, date: '06/18/2024' },
	{ value: 132.99, date: '06/17/2024' },
	{ value: 129.96, date: '06/14/2024' },
	{ value: 129.39, date: '06/13/2024' },
	{ value: 123.06, date: '06/12/2024' },
	{ value: 121.77, date: '06/11/2024' },
	{
		value: 120.37,
		date: '06/10/2024',
		label: 'Jun',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
];

const USER_PROFIT_DATA = [
	{ value: 10349.0, date: '06/10/2025' },
	{ value: 10250.0, date: '06/09/2025' },
	{ value: 10180.0, date: '06/08/2025' },
	{ value: 10120.0, date: '06/06/2025' },
	{ value: 10050.0, date: '06/05/2025' },
	{ value: 9980.0, date: '06/04/2025' },
	{ value: 9850.0, date: '06/03/2025' },
	{ value: 9720.0, date: '06/02/2025' },
	{ value: 9600.0, date: '05/30/2025' },
	{ value: 9450.0, date: '05/29/2025' },
	{ value: 9300.0, date: '05/28/2025' },
	{ value: 9150.0, date: '05/27/2025' },
	{ value: 9000.0, date: '05/23/2025' },
	{ value: 8850.0, date: '05/22/2025' },
	{ value: 8700.0, date: '05/21/2025' },
	{ value: 8550.0, date: '05/20/2025' },
	{ value: 8400.0, date: '05/19/2025' },
	{ value: 8250.0, date: '05/16/2025' },
	{ value: 8100.0, date: '05/15/2025' },
	{ value: 7950.0, date: '05/14/2025' },
	{ value: 7800.0, date: '05/13/2025' },
	{ value: 7650.0, date: '05/12/2025' },
	{ value: 7500.0, date: '05/09/2025' },
	{ value: 7350.0, date: '05/08/2025' },
	{ value: 7200.0, date: '05/07/2025' },
	{ value: 7050.0, date: '05/06/2025' },
	{ value: 6900.0, date: '05/05/2025' },
	{ value: 6750.0, date: '05/02/2025' },
	{
		value: 6600.0,
		date: '05/01/2025',
		label: 'May',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 6450.0, date: '04/30/2025' },
	{ value: 6300.0, date: '04/29/2025' },
	{ value: 6150.0, date: '04/28/2025' },
	{ value: 6000.0, date: '04/25/2025' },
	{ value: 5850.0, date: '04/24/2025' },
	{ value: 5700.0, date: '04/23/2025' },
	{ value: 5550.0, date: '04/22/2025' },
	{ value: 5400.0, date: '04/21/2025' },
	{ value: 5250.0, date: '04/17/2025' },
	{ value: 5100.0, date: '04/16/2025' },
	{ value: 4950.0, date: '04/15/2025' },
	{ value: 4800.0, date: '04/14/2025' },
	{ value: 4650.0, date: '04/11/2025' },
	{ value: 4500.0, date: '04/10/2025' },
	{ value: 4350.0, date: '04/09/2025' },
	{ value: 4200.0, date: '04/08/2025' },
	{ value: 4050.0, date: '04/07/2025' },
	{ value: 3900.0, date: '04/04/2025' },
	{ value: 3750.0, date: '04/03/2025' },
	{ value: 3600.0, date: '04/02/2025' },
	{
		value: 3450.0,
		date: '04/01/2025',
		label: 'Apr',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 3300.0, date: '03/31/2025' },
	{ value: 3150.0, date: '03/28/2025' },
	{ value: 3000.0, date: '03/27/2025' },
	{ value: 2850.0, date: '03/26/2025' },
	{ value: 2700.0, date: '03/25/2025' },
	{ value: 2550.0, date: '03/24/2025' },
	{ value: 2400.0, date: '03/21/2025' },
	{ value: 2250.0, date: '03/20/2025' },
	{ value: 2100.0, date: '03/19/2025' },
	{ value: 1950.0, date: '03/18/2025' },
	{ value: 1800.0, date: '03/17/2025' },
	{ value: 1650.0, date: '03/14/2025' },
	{ value: 1500.0, date: '03/13/2025' },
	{ value: 1350.0, date: '03/12/2025' },
	{ value: 1200.0, date: '03/11/2025' },
	{ value: 1050.0, date: '03/10/2025' },
	{ value: 900.0, date: '03/07/2025' },
	{ value: 750.0, date: '03/06/2025' },
	{ value: 600.0, date: '03/05/2025' },
	{ value: 450.0, date: '03/04/2025' },
	{ value: 300.0, date: '03/03/2025' },
	{ value: 150.0, date: '02/28/2025' },
	{ value: 0.0, date: '02/27/2025' },
	{ value: 150.0, date: '02/26/2025' },
	{ value: 300.0, date: '02/25/2025' },
	{ value: 450.0, date: '02/24/2025' },
	{ value: 600.0, date: '02/21/2025' },
	{ value: 750.0, date: '02/20/2025' },
	{ value: 900.0, date: '02/19/2025' },
	{ value: 1050.0, date: '02/18/2025' },
	{ value: 1200.0, date: '02/14/2025' },
	{ value: 1350.0, date: '02/13/2025' },
	{ value: 1500.0, date: '02/12/2025' },
	{ value: 1650.0, date: '02/11/2025' },
	{ value: 1800.0, date: '02/10/2025' },
	{ value: 1950.0, date: '02/07/2025' },
	{ value: 2100.0, date: '02/06/2025' },
	{ value: 2250.0, date: '02/05/2025' },
	{ value: 2400.0, date: '02/04/2025' },
	{ value: 2550.0, date: '02/03/2025' },
	{ value: 2700.0, date: '01/31/2025' },
	{ value: 2850.0, date: '01/30/2025' },
	{ value: 3000.0, date: '01/29/2025' },
	{ value: 3150.0, date: '01/28/2025' },
	{ value: 3300.0, date: '01/27/2025' },
	{ value: 3450.0, date: '01/24/2025' },
	{ value: 3600.0, date: '01/23/2025' },
	{ value: 3750.0, date: '01/22/2025' },
	{ value: 3900.0, date: '01/21/2025' },
	{ value: 4050.0, date: '01/17/2025' },
	{ value: 4200.0, date: '01/16/2025' },
	{ value: 4350.0, date: '01/15/2025' },
	{ value: 4500.0, date: '01/14/2025' },
	{ value: 4650.0, date: '01/13/2025' },
	{ value: 4800.0, date: '01/10/2025' },
	{ value: 4950.0, date: '01/08/2025' },
	{ value: 5100.0, date: '01/07/2025' },
	{ value: 5250.0, date: '01/06/2025' },
	{ value: 5400.0, date: '01/03/2025' },
	{ value: 5550.0, date: '01/02/2025' },
	{
		value: 5700.0,
		date: '12/31/2024',
		label: 'Dec',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 5850.0, date: '12/30/2024' },
	{ value: 6000.0, date: '12/27/2024' },
	{ value: 6150.0, date: '12/26/2024' },
	{ value: 6300.0, date: '12/24/2024' },
	{ value: 6450.0, date: '12/23/2024' },
	{ value: 6600.0, date: '12/20/2024' },
	{ value: 6750.0, date: '12/19/2024' },
	{ value: 6900.0, date: '12/18/2024' },
	{ value: 7050.0, date: '12/17/2024' },
	{ value: 7200.0, date: '12/16/2024' },
	{ value: 7350.0, date: '12/13/2024' },
	{ value: 7500.0, date: '12/12/2024' },
	{ value: 7650.0, date: '12/11/2024' },
	{ value: 7800.0, date: '12/10/2024' },
	{ value: 7950.0, date: '12/09/2024' },
	{ value: 8100.0, date: '12/06/2024' },
	{ value: 8250.0, date: '12/05/2024' },
	{ value: 8400.0, date: '12/04/2024' },
	{ value: 8550.0, date: '12/03/2024' },
	{ value: 8700.0, date: '12/02/2024' },
	{ value: 8850.0, date: '11/29/2024' },
	{ value: 9000.0, date: '11/27/2024' },
	{ value: 9150.0, date: '11/26/2024' },
	{ value: 9300.0, date: '11/25/2024' },
	{ value: 9450.0, date: '11/22/2024' },
	{ value: 9600.0, date: '11/21/2024' },
	{ value: 9750.0, date: '11/20/2024' },
	{ value: 9900.0, date: '11/19/2024' },
	{ value: 10050.0, date: '11/18/2024' },
	{ value: 10200.0, date: '11/15/2024' },
	{ value: 10350.0, date: '11/14/2024' },
	{ value: 10500.0, date: '11/13/2024' },
	{ value: 10650.0, date: '11/12/2024' },
	{ value: 10800.0, date: '11/11/2024' },
	{ value: 10950.0, date: '11/08/2024' },
	{ value: 11100.0, date: '11/07/2024' },
	{ value: 11250.0, date: '11/06/2024' },
	{ value: 11400.0, date: '11/05/2024' },
	{ value: 11550.0, date: '11/04/2024' },
	{
		value: 11700.0,
		date: '11/01/2024',
		label: 'Nov',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 11850.0, date: '10/31/2024' },
	{ value: 12000.0, date: '10/30/2024' },
	{ value: 12150.0, date: '10/29/2024' },
	{ value: 12300.0, date: '10/28/2024' },
	{ value: 12450.0, date: '10/25/2024' },
	{ value: 12600.0, date: '10/24/2024' },
	{ value: 12750.0, date: '10/23/2024' },
	{ value: 12900.0, date: '10/22/2024' },
	{ value: 13050.0, date: '10/21/2024' },
	{ value: 13200.0, date: '10/18/2024' },
	{ value: 13350.0, date: '10/17/2024' },
	{ value: 13500.0, date: '10/16/2024' },
	{ value: 13650.0, date: '10/15/2024' },
	{ value: 13800.0, date: '10/14/2024' },
	{ value: 13950.0, date: '10/11/2024' },
	{ value: 14100.0, date: '10/10/2024' },
	{ value: 14250.0, date: '10/09/2024' },
	{ value: 14400.0, date: '10/08/2024' },
	{ value: 14550.0, date: '10/07/2024' },
	{ value: 14700.0, date: '10/04/2024' },
	{ value: 14850.0, date: '10/03/2024' },
	{ value: 15000.0, date: '10/02/2024' },
	{
		value: 15150.0,
		date: '10/01/2024',
		label: 'Oct',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 15300.0, date: '09/30/2024' },
	{ value: 15450.0, date: '09/27/2024' },
	{ value: 15600.0, date: '09/26/2024' },
	{ value: 15750.0, date: '09/25/2024' },
	{ value: 15900.0, date: '09/24/2024' },
	{ value: 16050.0, date: '09/23/2024' },
	{ value: 16200.0, date: '09/20/2024' },
	{ value: 16350.0, date: '09/19/2024' },
	{ value: 16500.0, date: '09/18/2024' },
	{ value: 16650.0, date: '09/17/2024' },
	{ value: 16800.0, date: '09/16/2024' },
	{ value: 16950.0, date: '09/13/2024' },
	{ value: 17100.0, date: '09/12/2024' },
	{ value: 17250.0, date: '09/11/2024' },
	{ value: 17400.0, date: '09/10/2024' },
	{ value: 17550.0, date: '09/09/2024' },
	{ value: 17700.0, date: '09/06/2024' },
	{ value: 17850.0, date: '09/05/2024' },
	{ value: 18000.0, date: '09/04/2024' },
	{ value: 18150.0, date: '09/03/2024' },
	{ value: 18300.0, date: '08/30/2024' },
	{ value: 18450.0, date: '08/29/2024' },
	{ value: 18600.0, date: '08/28/2024' },
	{ value: 18750.0, date: '08/27/2024' },
	{ value: 18900.0, date: '08/26/2024' },
	{ value: 19050.0, date: '08/23/2024' },
	{ value: 19200.0, date: '08/22/2024' },
	{ value: 19350.0, date: '08/21/2024' },
	{ value: 19500.0, date: '08/20/2024' },
	{ value: 19650.0, date: '08/19/2024' },
	{ value: 19800.0, date: '08/16/2024' },
	{ value: 19950.0, date: '08/15/2024' },
	{ value: 20100.0, date: '08/14/2024' },
	{ value: 20250.0, date: '08/13/2024' },
	{ value: 20400.0, date: '08/12/2024' },
	{ value: 20550.0, date: '08/09/2024' },
	{ value: 20700.0, date: '08/08/2024' },
	{ value: 20850.0, date: '08/07/2024' },
	{ value: 21000.0, date: '08/06/2024' },
	{ value: 21150.0, date: '08/05/2024' },
	{ value: 21300.0, date: '08/02/2024' },
	{
		value: 21450.0,
		date: '08/01/2024',
		label: 'Aug',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 21600.0, date: '07/31/2024' },
	{ value: 21750.0, date: '07/30/2024' },
	{ value: 21900.0, date: '07/29/2024' },
	{ value: 22050.0, date: '07/26/2024' },
	{ value: 22200.0, date: '07/25/2024' },
	{ value: 22350.0, date: '07/24/2024' },
	{ value: 22500.0, date: '07/23/2024' },
	{ value: 22650.0, date: '07/22/2024' },
	{ value: 22800.0, date: '07/19/2024' },
	{ value: 22950.0, date: '07/18/2024' },
	{ value: 23100.0, date: '07/17/2024' },
	{ value: 23250.0, date: '07/16/2024' },
	{ value: 23400.0, date: '07/15/2024' },
	{ value: 23550.0, date: '07/12/2024' },
	{ value: 23700.0, date: '07/11/2024' },
	{ value: 23850.0, date: '07/10/2024' },
	{ value: 24000.0, date: '07/09/2024' },
	{ value: 24150.0, date: '07/08/2024' },
	{ value: 24300.0, date: '07/05/2024' },
	{ value: 24450.0, date: '07/03/2024' },
	{ value: 24600.0, date: '07/02/2024' },
	{
		value: 24750.0,
		date: '07/01/2024',
		label: 'Jul',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 24900.0, date: '06/28/2024' },
	{ value: 25050.0, date: '06/27/2024' },
	{ value: 25200.0, date: '06/26/2024' },
	{ value: 25350.0, date: '06/25/2024' },
	{ value: 25500.0, date: '06/24/2024' },
	{ value: 25650.0, date: '06/21/2024' },
	{ value: 25800.0, date: '06/20/2024' },
	{ value: 25950.0, date: '06/18/2024' },
	{ value: 26100.0, date: '06/17/2024' },
	{ value: 26250.0, date: '06/14/2024' },
	{ value: 26400.0, date: '06/13/2024' },
	{ value: 26550.0, date: '06/12/2024' },
	{ value: 26700.0, date: '06/11/2024' },
	{
		value: 26850.0,
		date: '06/10/2024',
		label: 'Jun',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
];

// ==========================================
// Components
// ==========================================
const StockChart: React.FC<StockChartProps> = ({
	data,
	maxValue,
	spacing,
	width,
	setTotalAmount,
}) => {
	// Use a ref to track the current pointer value
	const currentPointerRef = useRef<number | null>(null);
	const [currentPointerValue, setCurrentPointerValue] = useState<number | null>(
		null
	);

	// Update total amount when pointer value changes
	useEffect(() => {
		if (currentPointerValue !== null) {
			setTotalAmount(currentPointerValue);
		}
	}, [currentPointerValue, setTotalAmount]);

	const pointerConfig = {
		pointerStripHeight: 0,
		pointerColor: '#0099ff',
		radius: 6,
		pointerLabelWidth: 100,
		pointerLabelHeight: 90,
		activatePointersOnLongPress: true,
		autoAdjustPointerLabelPosition: true,
		pointerLabelComponent: (items: { value: number; date: string }[]) => {
			// Store the value in ref and schedule a state update
			if (currentPointerRef.current !== items[0].value) {
				currentPointerRef.current = items[0].value;
				// Use requestAnimationFrame to schedule the state update after render
				requestAnimationFrame(() => {
					setCurrentPointerValue(items[0].value);
				});
			}

			return null;
		},
	};

	return (
		<LineChart
			areaChart
			data={data}
			width={width}
			isAnimated
			animationDuration={1000}
			spacing={spacing}
			curved={true}
			initialSpacing={0}
			endSpacing={0}
			color="#007AFF"
			height={100}
			hideDataPoints
			dataPointsColor1="blue"
			startFillColor1="#b8e2ff"
			endFillColor1="#67b8f1"
			maxValue={maxValue}
			yAxisLabelPrefix="$"
			yAxisColor={'#8a8a8a'}
			yAxisSide={yAxisSides.RIGHT}
			yAxisTextStyle={{ color: '#8a8a8a', fontSize: 10 }}
			xAxisColor={'#8a8a8a'}
			xAxisLabelTextStyle={{ color: '#000000' }}
			pointerConfig={pointerConfig}
			disableScroll
			noOfSections={4}
		/>
	);
};

// ==========================================
// Main Component
// ==========================================
const HomeScreen: React.FC = () => {
	const screenWidth = Dimensions.get('window').width;
	const chartWidth = screenWidth - 20;
	const [stockData, setStockData] = useState<StockData[]>([]);
	const [selectedTimeRange, setSelectedTimeRange] = useState<'6months' | 'all'>(
		'6months'
	);
	const [totalAmount, setTotalAmount] = useState<number | null>(1383.44);

	useEffect(() => {
		try {
			console.log('Starting data processing...');
			// Process the array data directly
			const parsedData = NVDA_DATA.map((item) => ({
				date: item.date,
				amount: item.value,
			}));

			console.log('Successfully processed data points:', parsedData.length);
			console.log('First few data points:', parsedData.slice(0, 3));

			setStockData(parsedData);
		} catch (error) {
			console.error('Error processing stock data:', error);
		}
	}, []);

	// Helper function to process chart data
	const processChartData = (
		data: StockData[],
		cutoffDate: Date,
		timeRange: 'month' | '6months' | 'year' | 'all'
	) => {
		if (data.length === 0) {
			return { data: [], maxValue: 0 };
		}

		const filteredData = data.filter((item) => {
			const [month, day, year] = item.date.split('/');
			const itemDate = new Date(
				parseInt(year),
				parseInt(month) - 1,
				parseInt(day)
			);
			return itemDate >= cutoffDate;
		});

		const processedData = filteredData
			.map((item) => {
				const [month, day, year] = item.date.split('/');
				const date = new Date(
					parseInt(year),
					parseInt(month) - 1,
					parseInt(day)
				);

				const formattedDate = date.toLocaleDateString('en-US', {
					month: 'short',
				});

				let showLabel = false;
				let labelText = '';

				if (timeRange === '6months') {
					// For 6 months view, show first day of each month
					// Get the first occurrence of each month
					const currentMonth = date.getMonth();
					const isFirstOccurrence = !filteredData
						.slice(
							0,
							filteredData.findIndex((d) => d.date === item.date)
						)
						.some((d) => {
							const [prevMonth] = d.date.split('/');
							return parseInt(prevMonth) - 1 === currentMonth;
						});

					if (isFirstOccurrence) {
						showLabel = true;
						labelText = formattedDate;
					}
				} else {
					showLabel = parseInt(day) === 1;
					labelText = formattedDate;
				}

				return {
					value: item.amount,
					date: item.date,
					label: showLabel ? labelText : '',
					labelTextStyle: { color: 'lightgray', width: 60 },
				};
			})
			.reverse();

		const maxValue = Math.max(...processedData.map((point) => point.value));
		const minValue = Math.min(...processedData.map((point) => point.value));
		const range = maxValue - minValue;
		const niceRange = Math.ceil((maxValue + range * 0.1) / 10) * 10; // Add 10% padding to the top

		return {
			data: processedData,
			maxValue: niceRange,
		};
	};

	// Create separate data for each time range
	const sixMonthsData = useMemo(() => {
		const now = new Date();
		const cutoffDate = new Date(
			now.getFullYear(),
			now.getMonth() - 6,
			now.getDate()
		);
		return processChartData(stockData, cutoffDate, '6months');
	}, [stockData]);

	// Process stock data for the chart with time range filtering
	const chartData = useMemo(() => {
		console.log('Processing chart data, stockData length:', stockData.length);

		if (stockData.length === 0) {
			console.log('No stock data available for chart');
			return { data: [], maxValue: 0 };
		}

		// Filter data based on selected time range
		const now = new Date();
		let filteredData = [...stockData]; // Create a copy of the data

		// Calculate the cutoff date based on selected time range
		let cutoffDate: Date;
		switch (selectedTimeRange) {
			case '6months':
				cutoffDate = new Date(
					now.getFullYear(),
					now.getMonth() - 6,
					now.getDate()
				);
				break;
			case 'all':
				cutoffDate = new Date(0); // Beginning of time
				break;
			default:
				cutoffDate = new Date(
					now.getFullYear(),
					now.getMonth() - 6,
					now.getDate()
				);
		}

		// Filter the data based on the cutoff date
		filteredData = filteredData.filter((item) => {
			const [month, day, year] = item.date.split('/');
			const itemDate = new Date(
				parseInt(year),
				parseInt(month) - 1,
				parseInt(day)
			);
			return itemDate >= cutoffDate;
		});

		// Process the filtered data into the required format
		const data = filteredData
			.map((item) => {
				const [month, day, year] = item.date.split('/');
				const date = new Date(
					parseInt(year),
					parseInt(month) - 1,
					parseInt(day)
				);

				const formattedDate = date.toLocaleDateString('en-US', {
					month: 'short',
				});

				// Show label based on time range
				let showLabel = false;
				if (selectedTimeRange === '6months') {
					showLabel = parseInt(day) === 1; // Show on first day of each month
				}

				return {
					value: item.amount,
					date: item.date,
					label: showLabel ? formattedDate : '',
					labelTextStyle: { color: 'lightgray', width: 60 },
				};
			})
			.reverse(); // Reverse the array to make time increase from left to right

		// Calculate max value for y-axis
		const maxValue = Math.max(...data.map((point) => point.value));
		const minValue = Math.min(...data.map((point) => point.value));
		const range = maxValue - minValue;
		const niceRange = Math.ceil((maxValue + range * 0.1) / 10) * 10; // Add 10% padding to the top

		return {
			data,
			maxValue: niceRange,
		};
	}, [stockData, selectedTimeRange]);

	const [currentData, setCurrentData] = useState(chartData.data);

	useEffect(() => {
		let newData;
		switch (selectedTimeRange) {
			case '6months':
				newData = sixMonthsData.data;
				break;
			default:
				newData = sixMonthsData.data;
		}
		setCurrentData(newData);
	}, [selectedTimeRange, sixMonthsData]);

	// Function to handle quick actions (e.g., navigate to a new screen)
	const handleQuickAction = (action: string) => {
		console.log(`Action: ${action} button pressed!`);
	};

	// Function to handle AI suggestion actions
	const handleAISuggestionAction = (suggestion: AISuggestion) => {
		console.log(
			`AI Suggestion Action: ${suggestion.actionType} for ${suggestion.title}`
		);
		// Implement navigation or specific action based on actionType
	};

	// Render a single transaction item
	const renderTransactionItem = ({ item }: { item: Transaction }) => (
		<View style={styles.transactionItem}>
			<View style={styles.transactionIconContainer}>
				{item.type === 'expense' ? (
					<MaterialCommunityIcons
						name="currency-usd"
						size={24}
						color={styles.expenseText.color}
					/>
				) : (
					<MaterialCommunityIcons
						name="cash-plus"
						size={24}
						color={styles.incomeText.color}
					/>
				)}
			</View>
			<View style={styles.transactionDetails}>
				<Text style={styles.transactionDescription}>{item.description}</Text>
				<Text style={styles.transactionCategory}>
					{item.category} - {item.date}
				</Text>
			</View>
			<View style={styles.transactionAmountContainer}>
				<Text
					style={[
						styles.transactionAmount,
						item.type === 'expense' ? styles.expenseText : styles.incomeText,
					]}
				>
					{item.type === 'expense' ? '-' : '+'}${item.amount.toFixed(2)}
				</Text>
				{item.aiFlag && (
					<View style={styles.aiFlagContainer}>
						<Text style={styles.aiFlagText}>{item.aiFlag}</Text>
					</View>
				)}
			</View>
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar style="dark" />
			<ScrollView contentContainerStyle={styles.container}>
				{/* --- Header Section --- */}
				<View style={styles.header}>
					<Text style={styles.balanceLabel}>Total Value</Text>
					<Text style={styles.balanceAmount}>{totalAmount?.toFixed(2)}</Text>
					<Text style={styles.balanceLabel}>Month Change</Text>
					<Text style={styles.profitLabel}>+$22.88</Text>
				</View>
				<View
					style={[
						styles.chartContainer,
						{
							display: selectedTimeRange === '6months' ? 'flex' : 'none',
							paddingVertical: 20,
							paddingLeft: 20,
						},
					]}
				>
					{sixMonthsData.data.length > 0 ? (
						<StockChart
							data={sixMonthsData.data}
							maxValue={sixMonthsData.maxValue}
							spacing={Math.max(
								2,
								Math.min(18, (screenWidth - 60) / sixMonthsData.data.length)
							)}
							width={screenWidth - 80}
							setTotalAmount={setTotalAmount}
						/>
					) : (
						<View style={styles.loadingContainer}>
							<Text style={styles.emptyListText}>Loading chart data...</Text>
							<Text style={styles.debugText}>
								Stock data length: {stockData.length}
							</Text>
							<Text style={styles.debugText}>
								Chart data length: {sixMonthsData.data.length}
							</Text>
						</View>
					)}
				</View>

				{/* --- Summary Overview (Simplified Charts) --- */}
				<View style={[styles.card, styles.chartCard]}>
					<Text style={[styles.cardTitle, { paddingHorizontal: 20 }]}>
						Overview (This Month)
					</Text>
					<View style={[styles.summaryRow, { paddingHorizontal: 20 }]}>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Income</Text>
							<Text style={styles.incomeText}>+$0.00</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Expenses</Text>
							<Text style={styles.expenseText}>-$0.00</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryLabel}>Remaining Budget</Text>
							<Text style={styles.budgetAmount}>$0.00</Text>
						</View>
					</View>
				</View>

				{/* --- Recent Transactions Section --- */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Recent Transactions</Text>
					<FlatList
						data={[]}
						keyExtractor={(item) => item.id}
						renderItem={renderTransactionItem}
						scrollEnabled={false}
						ListEmptyComponent={() => (
							<Text style={styles.emptyListText}>No transactions yet.</Text>
						)}
					/>
					<TouchableOpacity
						style={styles.viewAllButton}
						onPress={() => handleQuickAction('View All Transactions')}
					>
						<Text style={styles.viewAllButtonText}>View All Transactions</Text>
						<MaterialCommunityIcons
							name="arrow-right"
							size={18}
							color="#007AFF"
						/>
					</TouchableOpacity>
				</View>

				{/* --- Quick Action Buttons --- */}
				<View style={styles.quickActionsContainer}>
					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={() => handleQuickAction('View Budgets')}
					>
						<MaterialCommunityIcons
							name="wallet-outline"
							size={24}
							color="#333"
						/>
						<Text style={styles.quickActionButtonText}>Budgets</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={() => handleQuickAction('Reports')}
					>
						<MaterialCommunityIcons name="chart-bar" size={24} color="#333" />
						<Text style={styles.quickActionButtonText}>Reports</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={() => handleQuickAction('Settings')}
					>
						<MaterialCommunityIcons name="cog-outline" size={24} color="#333" />
						<Text style={styles.quickActionButtonText}>Settings</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#F0F2F5',
	},
	container: {
		backgroundColor: '#ffffff',
	},
	header: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e0e0e0',
		padding: 20,
		alignItems: 'flex-start',
	},
	greetingText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#323232',
		marginBottom: 5,
	},
	balanceLabel: {
		fontSize: 14,
		color: '#707070',
		marginBottom: 5,
	},
	balanceAmount: {
		fontSize: 32,
		fontWeight: '500',
		color: '#2d2d2d',
	},
	profitLabel: {
		fontSize: 14,
		color: '#186d08',
	},

	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 15,
		padding: 20,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 3,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333333',
		marginBottom: 15,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 20,
	},
	summaryItem: {
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 15,
		color: '#777777',
		marginBottom: 5,
	},
	incomeText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#28A745',
	},
	expenseText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#DC3545',
	},
	budgetAmount: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#007AFF',
	},
	chartCard: {
		paddingHorizontal: 0,
		paddingBottom: 0,
		marginHorizontal: 0,
		width: '100%',
		borderRadius: 0,
	},
	chartContainer: {
		height: 200,
		backgroundColor: '#FFFFFF',
		borderRadius: 15,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		paddingHorizontal: 10,
		paddingVertical: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 3,
	},
	transactionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#EEEEEE',
	},
	transactionIconContainer: {
		marginRight: 15,
	},
	transactionDetails: {
		flex: 1,
	},
	transactionDescription: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333333',
	},
	transactionCategory: {
		fontSize: 13,
		color: '#777777',
		marginTop: 2,
	},
	transactionAmountContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	transactionAmount: {
		fontSize: 16,
		fontWeight: 'bold',
		marginLeft: 10,
	},
	aiFlagContainer: {
		backgroundColor: '#FFF3CD',
		borderRadius: 5,
		paddingHorizontal: 8,
		paddingVertical: 3,
		marginLeft: 10,
		borderWidth: 1,
		borderColor: '#FFC107',
	},
	aiFlagText: {
		fontSize: 12,
		color: '#856404',
		fontWeight: 'bold',
	},
	emptyListText: {
		textAlign: 'center',
		color: '#777777',
		paddingVertical: 20,
	},
	viewAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 15,
		paddingVertical: 10,
		backgroundColor: '#F7F7F7',
		borderRadius: 10,
	},
	viewAllButtonText: {
		color: '#007AFF',
		fontSize: 16,
		fontWeight: 'bold',
		marginRight: 5,
	},
	quickActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 20,
		marginBottom: 10,
	},
	quickActionButton: {
		alignItems: 'center',
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		flex: 1,
		marginHorizontal: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 2,
	},
	quickActionButtonText: {
		marginTop: 5,
		fontSize: 13,
		fontWeight: '500',
		color: '#555555',
	},
	labelContainer: {
		width: 60,
		alignItems: 'center',
	},
	labelText: {
		color: '#666666',
		fontSize: 12,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	debugText: {
		color: '#666',
		fontSize: 12,
		marginTop: 5,
	},
	timeRangeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		paddingVertical: 10,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		marginBottom: 10,
	},
	timeRangeButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E9ECEF',
	},
	timeRangeButtonActive: {
		backgroundColor: '#007AFF',
		borderColor: '#007AFF',
	},
	timeRangeButtonText: {
		fontSize: 12,
		color: '#495057',
		fontWeight: '500',
	},
	timeRangeButtonTextActive: {
		color: '#FFFFFF',
	},
	darkChartContainer: {
		marginTop: 20,
		height: 500,
		backgroundColor: '#131313',
		borderRadius: 15,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		// overflow: 'hidden',
	},
	chartsContainer: {
		width: '100%',
		position: 'relative',
	},
});

export default HomeScreen;
