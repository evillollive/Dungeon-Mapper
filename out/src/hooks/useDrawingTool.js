import { useState, useCallback, useEffect } from 'react';
export function useDrawingTool() {
    const [activeTool, setActiveTool] = useState('paint');
    const [activeTile, setActiveTile] = useState('floor');
    const handleKeyDown = useCallback((e) => {
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA')
            return;
        switch (e.key.toLowerCase()) {
            case 'p':
                setActiveTool('paint');
                break;
            case 'e':
                setActiveTool('erase');
                break;
            case 'f':
                setActiveTool('fill');
                break;
            case 'n':
                setActiveTool('note');
                break;
            case 'l':
                setActiveTool('line');
                break;
            case 'r':
                setActiveTool('rect');
                break;
            case 's':
                setActiveTool('select');
                break;
            case 'v':
                setActiveTool('reveal');
                break;
            case 'h':
                setActiveTool('hide');
                break;
        }
    }, []);
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    return {
        activeTool,
        setActiveTool,
        activeTile,
        setActiveTile,
    };
}
