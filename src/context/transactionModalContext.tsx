import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TransactionModalContextType {
	showTransactionModal: () => void;
	hideTransactionModal: () => void;
	isModalVisible: boolean;
}

const TransactionModalContext = createContext<
	TransactionModalContextType | undefined
>(undefined);

export const useTransactionModal = () => {
	const context = useContext(TransactionModalContext);
	if (context === undefined) {
		throw new Error(
			'useTransactionModal must be used within a TransactionModalProvider'
		);
	}
	return context;
};

interface TransactionModalProviderProps {
	children: ReactNode;
}

export const TransactionModalProvider: React.FC<
	TransactionModalProviderProps
> = ({ children }) => {
	const [isModalVisible, setIsModalVisible] = useState(false);

	const showTransactionModal = () => {
		setIsModalVisible(true);
	};

	const hideTransactionModal = () => {
		setIsModalVisible(false);
	};

	return (
		<TransactionModalContext.Provider
			value={{
				showTransactionModal,
				hideTransactionModal,
				isModalVisible,
			}}
		>
			{children}
		</TransactionModalContext.Provider>
	);
};
