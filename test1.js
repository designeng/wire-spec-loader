var coffee = require('coffee-script');
var fs = require('fs');
var esprima = require('esprima');
var escodegen = require('escodegen');
var _ = require('underscore');

var source = fs.readFileSync('./test/fixture/component.spec.coffee', 'utf-8');

var imports = '';
var result = coffee.compile(source, {bare: true});

var ast = analyzeCode(result);
result = "module.exports = " + escodegen.generate(ast);

console.log(result);

function analyzeCode(code) {
    var ast = esprima.parse(code);

    traverse(ast, function(node) {
        if(node.type === 'ExpressionStatement' ){
            var specComponents = node.expression.properties
            _.each(specComponents, function(component){
                if(component.value.type === 'ObjectExpression'){
                    _.each(component.value.properties, function(props){
                        if(props.key.type === 'Identifier' && (props.key.name === 'create' || props.key.name === 'module')){
                            var path = props.value.value;
                            var moduleName = _.last(path.split('/')) + _.uniqueId();
                            pushImport(ast, moduleName, path);
                            props.value = _.extend(props.value, 
                                {
                                    type: "Identifier",
                                    name: moduleName
                                }
                            );
                        }
                    })
                }
            })
        }
    });
    return ast;
}

function traverse(node, func) {
    func(node);
    for (var key in node) {
        if (node.hasOwnProperty(key)) {
            var child = node[key];
            if (typeof child === 'object' && child !== null) {
                if (Array.isArray(child)) {
                    child.forEach(function(node) {
                        traverse(node, func);
                    });
                } else {
                    traverse(child, func);
                }
            }
        }
    }
}

function pushImport(ast, varName, path) {
    ast.body.push({
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": varName
                },
                "init": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "Identifier",
                        "name": "require"
                    },
                    "arguments": [
                        {
                            "type": "Literal",
                            "value": path,
                            "raw": "'" + path + "'"
                        }
                    ]
                }
            }
        ],
        "kind": "var"
    });
}