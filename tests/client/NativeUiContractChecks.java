import com.cobblemon.mod.common.client.gui.interact.wheel.*;
import com.google.common.collect.*;
import net.minecraft.resources.ResourceLocation;
import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;
import java.util.*;

/** Locked upstream endpoints and real native option objects, without starting a window. */
public final class NativeUiContractChecks {
    private static ClassNode node(String name)throws Exception{
        var input=NativeUiContractChecks.class.getClassLoader().getResourceAsStream(name.replace('.','/')+".class");
        if(input==null)throw new AssertionError("Missing locked class "+name);var node=new ClassNode();try(input){new ClassReader(input).accept(node,0);}return node;
    }
    private static MethodNode method(String owner,String name,String descriptor)throws Exception{
        return node(owner).methods.stream().filter(method->method.name.equals(name)&&method.desc.equals(descriptor)).findFirst().orElseThrow(()->new AssertionError(owner+"."+name+descriptor));
    }
    private static void invocation(MethodNode method,String owner,String name)throws Exception{
        for(var instruction:method.instructions)if(instruction instanceof MethodInsnNode call&&call.owner.equals(owner)&&call.name.equals(name))return;
        throw new AssertionError("Locked invocation changed: "+owner+"."+name);
    }
    public static void verify()throws Exception{
        var render=method("com.cobblemon.mod.common.client.render.pokemon.PokemonRenderer","renderNameTag","(Lcom/cobblemon/mod/common/entity/pokemon/PokemonEntity;Lnet/minecraft/network/chat/Component;Lcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;IF)V");
        invocation(render,"com/cobblemon/mod/common/api/storage/player/client/ClientGeneralPlayerData","getShowChallengeLabel");
        method("com.cobblemon.mod.common.client.keybind.keybinds.PartySendBinding","processEntityTarget","(Lnet/minecraft/client/player/LocalPlayer;Lcom/cobblemon/mod/common/pokemon/Pokemon;Lnet/minecraft/world/entity/LivingEntity;)V");
        invocation(method("com.cobblemon.mod.common.client.gui.interact.wheel.InteractWheelGuiFactoryKt","createPlayerInteractGui","(Lcom/cobblemon/mod/common/net/messages/client/PlayerInteractOptionsPacket;)Lcom/cobblemon/mod/common/client/gui/interact/wheel/InteractWheelGUI;"),"com/cobblemon/mod/common/client/gui/interact/wheel/InteractWheelGUI","<init>");
        method("com.cobblemon.mod.common.net.serverhandling.ChallengeHandler","handle","(Lcom/cobblemon/mod/common/net/messages/server/BattleChallengePacket;Lnet/minecraft/server/MinecraftServer;Lnet/minecraft/server/level/ServerPlayer;)V");
        method("com.cobblemon.mod.common.net.serverhandling.battle.SpectateBattleHandler","handle","(Lcom/cobblemon/mod/common/net/messages/server/battle/SpectateBattlePacket;Lnet/minecraft/server/MinecraftServer;Lnet/minecraft/server/level/ServerPlayer;)V");
        var values=ArrayListMultimap.<Orientation,InteractWheelOption>create();int[] pressed={0};
        for(var id:List.of("interact_wheel_icon_battle.png","interact_wheel_icon_spectate_battle.png","interact_wheel_icon_trade.png","addon_activity.png"))
            values.put(Orientation.values()[0],new InteractWheelOption(ResourceLocation.fromNamespaceAndPath("cobblemon","textures/gui/"+id),null,true,id,()->new org.joml.Vector3f(1),()->{pressed[0]++;return kotlin.Unit.INSTANCE;}));
        var filter=dev.worldcombat.cobblemon.mixin.WorldPlayerWheelMixin.class.getDeclaredMethod("worldcombat$options",Multimap.class);filter.setAccessible(true);
        var result=(Multimap<?,InteractWheelOption>)filter.invoke(null,values);
        if(values.size()!=4||result.size()!=2)throw new AssertionError("Native options mutated or valid options removed");
        for(var option:result.values()){if(option.getTooltipText().contains("battle"))throw new AssertionError("Retired option kept");option.getOnPress().invoke();}
        if(pressed[0]!=2)throw new AssertionError("Trade/addon callbacks lost");
        try(var resource=NativeUiContractChecks.class.getClassLoader().getResourceAsStream("assets/ldlib2/lss/mc.lss")){
            if(resource==null)throw new AssertionError("Locked LDLib MC theme missing");
            var raw=new String(resource.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);
            var stylesheet=com.lowdragmc.lowdraglib2.gui.ui.style.Stylesheet.parse(raw);
            if(stylesheet.rules.size()<10)throw new AssertionError("MC theme failed native parsing");
        }
        System.out.println("PASS locked native UI endpoints; trade/addon wheel callbacks preserved; LDLib MC stylesheet native parser");
    }
}
