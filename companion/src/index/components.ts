import { Project, Node, Type, SyntaxKind } from 'ts-morph';
import path from 'path';

export interface ComponentData {
  name: string;
  import: string;
  export: 'named' | 'default';
  props: Array<{
    name: string;
    type: string;
    optional: boolean;
  }>;
  usageCount: number;
  maps: string[];
}

export interface IndexOptions {
  projectPath: string;
  componentsDirs: string[];
  importAlias?: string;
}

export function indexComponents({ projectPath, componentsDirs, importAlias = '@' }: IndexOptions): ComponentData[] {
  const project = new Project({
    tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
  });

  const components: ComponentData[] = [];
  
  // To calculate usage count, we need to scan all JSX elements in the repo.
  // First, let's collect all JSX identifiers.
  const jsxUsages = new Map<string, number>();
  for (const file of project.getSourceFiles()) {
    file.forEachDescendant(node => {
      if (Node.isJsxOpeningElement(node) || Node.isJsxSelfClosingElement(node)) {
        const tagNameNode = node.getTagNameNode();
        const tagName = tagNameNode.getText();
        jsxUsages.set(tagName, (jsxUsages.get(tagName) || 0) + 1);
      }
    });
  }

  // Iterate over files in the configured component directories
  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    
    // Check if the file is in one of the componentsDirs
    const isInComponentDir = componentsDirs.some(dir => filePath.includes(path.normalize(dir).replace(/\\/g, '/')));
    if (!isInComponentDir) continue;

    // Must be returning JSX. 
    // We will look for exported functions or variables
    const exportedDeclarations = sourceFile.getExportedDeclarations();

    for (const [name, declarations] of exportedDeclarations.entries()) {
      for (const declaration of declarations) {
        if (!Node.isFunctionDeclaration(declaration) && !Node.isVariableDeclaration(declaration)) {
          continue;
        }

        let isComponent = false;
        let propsType: Type | undefined;
        let jsDocTags: string[] = [];

        if (Node.isFunctionDeclaration(declaration)) {
          isComponent = true; // simplified check
          const params = declaration.getParameters();
          if (params.length > 0) {
            propsType = params[0].getType();
          }
          jsDocTags = declaration.getJsDocs().flatMap(doc => doc.getTags().map(t => t.getTagName() + (t.getComment() ? ' ' + t.getComment() : '')));
        } else if (Node.isVariableDeclaration(declaration)) {
          const initializer = declaration.getInitializer();
          if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
            isComponent = true;
            const params = initializer.getParameters();
            if (params.length > 0) {
              propsType = params[0].getType();
            }
            const statement = declaration.getFirstAncestorByKind(SyntaxKind.VariableStatement);
            if (statement) {
              jsDocTags = statement.getJsDocs().flatMap(doc => doc.getTags().map(t => t.getTagName() + (t.getComment() ? ' ' + t.getComment() : '')));
            }
          }
        }

        if (!isComponent) continue;

        // Skip hooks
        if (name.startsWith('use')) continue;
        // Skip context providers
        if (name.endsWith('Provider')) continue;

        const isDefaultExport = name === 'default';
        const componentName = isDefaultExport ? sourceFile.getBaseNameWithoutExtension() : name;

        // Extract props
        const props: ComponentData['props'] = [];
        if (propsType && propsType.isObject()) {
          for (const prop of propsType.getProperties()) {
            const propDecl = prop.getValueDeclaration();
            let isOptional = false;
            if (propDecl && Node.isPropertySignature(propDecl)) {
              isOptional = propDecl.hasQuestionToken();
            } else if (propDecl && Node.isParameterDeclaration(propDecl)) {
              isOptional = propDecl.isOptional();
            }

            const propType = prop.getTypeAtLocation(declaration).getText();

            props.push({
              name: prop.getName(),
              type: propType,
              optional: isOptional,
            });
          }
        }

        // Infer maps[]
        const maps: string[] = [];
        
        // Rule 1: JSDoc @snapforge tag
        const snapforgeTag = jsDocTags.find(tag => tag.startsWith('snapforge '));
        if (snapforgeTag) {
          maps.push(snapforgeTag.split(' ')[1]);
        } else {
          // Rule 2: Component name heuristics
          const lowerName = componentName.toLowerCase();
          if (lowerName.includes('card')) maps.push('container.card');
          else if (lowerName.includes('button')) maps.push('button.primary');
          else if (lowerName.includes('switch')) maps.push('control.switch');
          else if (lowerName.includes('row')) maps.push('layout.row');
          
          // Rule 3: Prop signature heuristics
          if (maps.length === 0) {
            const hasChecked = props.some(p => p.name === 'checked');
            const hasOnChange = props.some(p => p.name === 'onChange');
            if (hasChecked && hasOnChange) maps.push('control.switch');
          }
        }

        // Construct import path using alias
        // Find relative path from projectPath to filePath
        let relPath = path.relative(projectPath, filePath).replace(/\\/g, '/');
        // Strip extension
        relPath = relPath.replace(/\.[^/.]+$/, "");
        // Map to alias (e.g. src/components -> @/components)
        // This is a naive implementation; tsconfig paths should actually be read
        const importPath = relPath.startsWith('src/') ? relPath.replace('src/', importAlias + '/') : relPath;

        components.push({
          name: componentName,
          import: importPath,
          export: isDefaultExport ? 'default' : 'named',
          props,
          usageCount: jsxUsages.get(componentName) || 0,
          maps
        });
      }
    }
  }

  return components;
}
