import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';
import { getReferralTree } from '@/services/api';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReferralTree({ userId }: { userId: string, maxLevels?: number }) {
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    async function loadTree() {
      try {
        const data = await getReferralTree(userId);
        setTreeData(data);
      } catch (error) {
        console.error('Failed to load referral tree:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, [userId]);

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const renderForeignObjectNode = ({
    nodeDatum,
    toggleNode,
    foreignObjectProps
  }: any) => (
    <g>
      <circle r={15} fill="hsl(var(--primary))" />
      <foreignObject {...foreignObjectProps}>
        <div className="bg-background/95 border border-primary/20 p-2 rounded-lg shadow-xl backdrop-blur-sm text-center">
          <p className="text-[10px] font-bold text-foreground truncate max-w-[120px]">
            {nodeDatum.name || 'Anonymous'}
          </p>
          <p className="text-[8px] text-muted-foreground">
            Level {nodeDatum.level || '?'}
          </p>
          {nodeDatum.children && nodeDatum.children.length > 0 && (
            <button 
              onClick={toggleNode}
              className="mt-1 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded text-[8px] font-bold text-primary transition-colors"
            >
              {nodeDatum.__rd3t.collapsed ? `Expand (${nodeDatum.children.length})` : 'Collapse'}
            </button>
          )}
        </div>
      </foreignObject>
    </g>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Network Architecture</h3>
          <p className="text-xs text-muted-foreground">Visual map of your 15-level organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setTranslate(prev => ({ ...prev, y: prev.y + 50 }))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setTranslate(prev => ({ ...prev, y: prev.y - 50 }))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="h-[600px] w-full v56-glass premium-border rounded-3xl overflow-hidden relative bg-[#0a0a0a]"
      >
        {treeData && (
          <Tree
            data={treeData}
            translate={translate}
            orientation="vertical"
            pathFunc="step"
            renderCustomNodeElement={(rd3tProps) =>
              renderForeignObjectNode({
                ...rd3tProps,
                foreignObjectProps: {
                  width: 140,
                  height: 80,
                  x: -70,
                  y: 20
                }
              })
            }
            nodeSize={{ x: 180, y: 150 }}
            separation={{ siblings: 1.2, nonSiblings: 2 }}
          />
        )}
      </div>
    </div>
  );
}
