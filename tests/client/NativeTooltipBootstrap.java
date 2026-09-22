import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;
import java.nio.file.*;

/** Headless bootstrap of the two official KubeJS Ingredient extensions used by its tooltip event. */
public final class NativeTooltipBootstrap {
    private static ClassNode read(String name)throws Exception{
        try(var input=NativeTooltipBootstrap.class.getClassLoader().getResourceAsStream(name+".class")){
            if(input==null)throw new AssertionError(name);var node=new ClassNode();new ClassReader(input).accept(node,0);return node;
        }
    }
    public static void main(String[] arguments)throws Exception{
        var ingredient=read("net/minecraft/world/item/crafting/Ingredient");
        var mixin=read("dev/latvian/mods/kubejs/core/mixin/IngredientMixin");
        if(!mixin.interfaces.contains("dev/latvian/mods/kubejs/core/IngredientKJS"))throw new AssertionError("Locked Ingredient mixin contract changed");
        ingredient.interfaces.add("dev/latvian/mods/kubejs/core/IngredientKJS");
        // Copy upstream's actual self method; kjs$isWildcard executes the upstream interface default.
        ingredient.methods.add(mixin.methods.stream().filter(method->method.name.equals("kjs$self")).findFirst().orElseThrow());
        var writer=new ClassWriter(0);ingredient.accept(writer);
        var file=Path.of(arguments[0]).resolve("net/minecraft/world/item/crafting/Ingredient.class");Files.createDirectories(file.getParent());Files.write(file,writer.toByteArray());
    }
}
