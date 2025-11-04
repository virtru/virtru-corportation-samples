import React, { useEffect, useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useRpcClient } from '@/hooks/useRpcClient';

interface Props {
  value: string | null;
  onChange: (value: string) => void;
}

export function SourceTypeSelector({ value, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const handleSelection = (selectedType: string) =>  {
    onChange(selectedType);
    closeMenu();
  };

  const [typeList, setTypeList] = useState<string[]>([]);
  const { listSrcTypes } = useRpcClient();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { srcTypes } = await listSrcTypes({});
        setTypeList(srcTypes);
	      console.log("Fetched source types:", srcTypes);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTypes();
  }, []);

  return (
    <>
      <Button 
        variant="contained"
        size="small"
        onClick={openMenu}
        endIcon={open ? <ExpandLess /> : <ExpandMore />}
        sx={{ marginBottom: 1, textTransform: 'capitalize' }}
      >
        {value ? `${value}` : 'Select Source Type'}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={closeMenu}>
        {typeList.map(t => (
          <MenuItem key={t} onClick={() => handleSelection(t)} disableRipple>{t}</MenuItem>
        ))}
      </Menu>
    </>
  );
}
