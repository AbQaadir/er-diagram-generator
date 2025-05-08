import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import EntityNode from '@/components/EntityNode';
import html2canvas from 'html2canvas';
import { Input } from '@/components/ui/input';
import { FaRegPaperPlane } from 'react-icons/fa';
import { GoogleGenAI } from "@google/genai";

// Custom node types
const nodeTypes: NodeTypes = {
  entityNode: EntityNode
};

const defaultCode = `{
  "entities": [
    {
      "id": "1",
      "name": "User",
      "attributes": ["id (PK)", "username", "email", "created_at"]
    },
    {
      "id": "2",
      "name": "Post",
      "attributes": ["id (PK)", "title", "content", "user_id (FK)", "created_at"]
    },
    {
      "id": "3",
      "name": "Comment",
      "attributes": ["id (PK)", "content", "user_id (FK)", "post_id (FK)", "created_at"]
    }
  ],
  "relationships": [
    { "id": "r1", "source": "1", "target": "2", "label": "1:N" },
    { "id": "r2", "source": "1", "target": "3", "label": "1:N" },
    { "id": "r3", "source": "2", "target": "3", "label": "1:N" }
  ]
}`;

// Convert entities to nodes
const convertEntitiesToNodes = (entities) => {
  return entities.map((entity, index) => {
    return {
      id: entity.id,
      type: 'entityNode',
      data: {
        name: entity.name,
        attributes: entity.attributes
      },
      position: { x: 150 * index, y: 150 * index }
    };
  });
};

// Convert relationships to edges
const convertRelationshipsToEdges = (relationships) => {
  return relationships.map((rel) => {
    return {
      id: rel.id,
      source: rel.source,
      target: rel.target,
      label: rel.label,
      style: { stroke: '#555' },
      labelStyle: { fontWeight: 'bold' }
    };
  });
};

const initialNodes: Node[] = convertEntitiesToNodes([
  {
    id: '1',
    name: 'User',
    attributes: ['id (PK)', 'username', 'email', 'created_at']
  },
  {
    id: '2',
    name: 'Post',
    attributes: ['id (PK)', 'title', 'content', 'user_id (FK)', 'created_at']
  }
]);

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', label: '1:N', style: { stroke: '#555' } }
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const systemPrompt = `You are a database schema designer and ER diagram assistant. Your job is to help convert high-level ideas into structured database schemas in JSON format.

Follow these steps every time:

1. Understand the domain or system name (e.g., "Student Registration System", "Blog Platform").
2. Identify the key entities (tables) involved in the system.
3. For each entity:
   - Assign a unique ID (e.g., "1", "2", "3", ...).
   - Define a clear name (e.g., "Student", "Course").
   - List attributes (fields) using the format: field_name (PK) for primary key or field_name (FK) for foreign key.
4. Determine the relationships between entities:
   - Each relationship includes a source entity, a target entity, and a cardinality label (like "1:N", "N:1", "M:N").
5. Output a JSON object with two top-level keys:
   - "entities": array of entity definitions.
   - "relationships": array of relationship objects.

Important guidelines:
- Always include primary keys (PK).
- Use foreign keys (FK) where applicable.
- Keep the output clean and consistently formatted.
- Do not add explanations or commentary outside the JSON.

Example Output Format:

{
  "entities": [
    {
      "id": "1",
      "name": "EntityName",
      "attributes": ["id (PK)", "attribute1", "attribute2", "foreign_key_id (FK)"]
    }
  ],
  "relationships": [
    { "id": "r1", "source": "1", "target": "2", "label": "1:N" }
  ]
}

Begin by thinking through the domain and then produce the structured JSON output only.`;

const Index = () => {
  const [code, setCode] = useState(defaultCode);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nlInput, setNlInput] = useState('');
  const [loading, setLoading] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({
      ...connection,
      style: { stroke: '#555' }
    }, eds)),
    [setEdges]
  );

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleRenderFlow = () => {
    try {
      const data = JSON.parse(code);
      
      if (data.entities && Array.isArray(data.entities)) {
        setNodes(convertEntitiesToNodes(data.entities));
      } else if (data.nodes && Array.isArray(data.nodes)) {
        // Fallback to original nodes format
        setNodes(data.nodes);
      }
      
      if (data.relationships && Array.isArray(data.relationships)) {
        setEdges(convertRelationshipsToEdges(data.relationships));
      } else if (data.edges && Array.isArray(data.edges)) {
        // Fallback to original edges format
        setEdges(data.edges);
      }
      
      toast.success('ERD diagram updated successfully');
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      toast.error('Invalid JSON format. Please check your code.');
    }
  };

  // Update node attributes handler
  const handleAttributesChange = useCallback((nodeId: string, newAttributes: string[]) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, attributes: newAttributes } }
          : node
      )
    );
  }, [setNodes]);

  // Export diagram as image
  const handleExportImage = async () => {
    const diagramArea = document.querySelector('.react-flow');
    if (diagramArea) {
      // Hide all "+ Add Field" buttons before export
      const addFieldButtons = diagramArea.querySelectorAll('.add-field-btn');
      addFieldButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');
      // Export
      const canvas = await html2canvas(diagramArea as HTMLElement, { backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `erd-diagram-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
      // Restore buttons
      addFieldButtons.forEach(btn => (btn as HTMLElement).style.display = '');
    }
  };

  // New: Handle natural language ERD generation
  const handleNlSubmit = async () => {
    if (!nlInput.trim()) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: nlInput,
        config: {
          systemInstruction: systemPrompt,
        },
      });
      const text = response.text;
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in Gemini response');
      const json = JSON.parse(jsonMatch[0]);
      // Update the ERD diagram
      if (json.entities && Array.isArray(json.entities)) {
        setNodes(convertEntitiesToNodes(json.entities));
      }
      if (json.relationships && Array.isArray(json.relationships)) {
        setEdges(convertRelationshipsToEdges(json.relationships));
      }
      toast.success('ERD generated from natural language!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate ERD from Gemini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen p-4 gap-4 bg-background">
      {/* Header: Title and Export Button */}
      <div className="flex flex-row items-center justify-between w-full max-w-6xl mx-auto mb-2 order-0">
        <h1 className="text-2xl font-bold tracking-tight text-primary">ER Diagram Generator</h1>
        <Button onClick={handleExportImage} variant="outline" className="ml-4 whitespace-nowrap">Export as JPG</Button>
      </div>

      {/* ERD Chart */}
      <div className="flex-1 min-h-[400px] order-1 mb-4 max-w-6xl w-full mx-auto bg-white dark:bg-muted border rounded-lg overflow-hidden">
        <div className="w-full h-[600px] md:h-[600px] sm:h-[400px]">
          <ReactFlow
            nodes={nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                onAttributesChange: (attrs: string[]) => handleAttributesChange(node.id, attrs),
              },
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background color="#aaa" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Natural language input field */}
      <div className="flex flex-row items-center gap-2 bg-muted rounded-lg px-4 py-2 shadow order-2 max-w-2xl w-full mx-auto">
        <Input
          className="flex-1 border-0 bg-transparent focus:ring-0 text-base placeholder:text-muted-foreground"
          placeholder="What do you want to know?"
          value={nlInput}
          onChange={e => setNlInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleNlSubmit(); }}
          disabled={loading}
        />
        <Button
          size="icon"
          className="rounded-full bg-primary text-white hover:bg-primary/90"
          onClick={handleNlSubmit}
          disabled={loading}
        >
          <FaRegPaperPlane className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
