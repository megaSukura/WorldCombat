package dev.worldcombat.core.world;

import com.mojang.brigadier.StringReader;
import com.mojang.brigadier.exceptions.CommandSyntaxException;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.HolderLookup;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateHolder;
import net.minecraft.world.level.block.state.properties.Property;
import java.util.Map;
import java.util.TreeMap;

/** Uses native property parsing while retaining unspecified values on an existing block of the same type. */
public final class NativeBlockStates {
    private NativeBlockStates() {}
    public static BlockState parse(HolderLookup<Block> lookup, String input, BlockState current) throws CommandSyntaxException {
        var reader = new StringReader(input);
        var parsed = BlockStateParser.parseForBlock(lookup, reader, false);
        if (reader.canRead()) throw new IllegalArgumentException("Trailing block state input");
        var state = parsed.blockState();
        if (current != null && current.is(state.getBlock())) {
            state = current;
            for (var entry : parsed.properties().entrySet()) state = set(state, entry.getKey(), entry.getValue());
        }
        return state;
    }
    @SuppressWarnings("unchecked")
    private static <T extends Comparable<T>> BlockState set(BlockState state, Property<T> property, Comparable<?> value) {
        return state.setValue(property, (T) value);
    }
    public static Map<String, String> properties(StateHolder<?, ?> state) {
        var result = new TreeMap<String, String>();
        for (var property : state.getProperties()) result.put(property.getName(), value(state, property));
        return result;
    }
    private static <T extends Comparable<T>> String value(StateHolder<?, ?> state, Property<T> property) {
        return property.getName(state.getValue(property));
    }
}
