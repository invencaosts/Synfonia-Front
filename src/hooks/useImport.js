import { useContext } from 'react';
import { ImportContext } from '../context/ImportContextObject';

export const useImport = () => useContext(ImportContext);
