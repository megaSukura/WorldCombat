package dev.worldcombat.core.client;

import dev.worldcombat.core.client.ItemInformation;
import java.util.List;

/** Neutral declaration lifecycle; no Minecraft or optional viewer needs to be installed. */
public final class ItemInformationChecks {
    public static void main(String[] ignored) {
        int[] updates = {0,0};
        ItemInformation.subscribe("first", () -> updates[0]++);
        ItemInformation.subscribe("second", () -> updates[1]++);
        ItemInformation.beginReload();
        ItemInformation.register("checks:machine",new String[]{"checks.use.first","checks.use.shared"});
        ItemInformation.register("checks:machine",new String[]{"checks.use.shared","checks.use.second"});
        ItemInformation.register("checks:missing_addon",new String[]{"checks.use.optional"});
        if(updates[0]!=0)throw new AssertionError("Reload published partial content");
        ItemInformation.completeReload(true);
        var entries=ItemInformation.entries();
        if(entries.size()!=2||!entries.getFirst().keys().equals(List.of("checks.use.first","checks.use.shared","checks.use.second")))throw new AssertionError(entries);
        if(updates[0]!=1||updates[1]!=1)throw new AssertionError("Viewer subscriptions were overwritten");
        try{entries.getFirst().keys().add("changed");throw new AssertionError("Mutable snapshot");}catch(UnsupportedOperationException expected){}
        ItemInformation.beginReload();ItemInformation.register("checks:other",new String[]{"checks.use.new"});ItemInformation.completeReload(true);
        if(ItemInformation.entries().size()!=1||!ItemInformation.entries().getFirst().item().equals("checks:other"))throw new AssertionError("Old declarations survived reload");
        ItemInformation.refresh();if(updates[0]!=3)throw new AssertionError("Resource refresh lost");
        ItemInformation.subscribe("second",null);
        ItemInformation.beginReload();ItemInformation.register("checks:partial",new String[]{"checks.partial"});ItemInformation.completeReload(false);
        if(!ItemInformation.entries().isEmpty()||updates[0]!=4||updates[1]!=3)throw new AssertionError("Failed reload or unavailable viewer retained data");
        ItemInformation.subscribe("first",null);
        System.out.println("PASS item information: ordered contributions, dedupe, immutable snapshots, atomic reload replacement, failure cleanup, independent optional viewers and resource refresh");
    }
}
