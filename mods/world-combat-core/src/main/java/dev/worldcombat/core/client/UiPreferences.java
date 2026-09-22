package dev.worldcombat.core.client;

import com.google.gson.*;
import java.nio.file.*;
import java.io.IOException;

/** Small local presentation preferences. Never changes server-side skill authorization or data. */
public final class UiPreferences {
    private static JsonObject values;
    private UiPreferences() {}
    private static Path file(){return net.neoforged.fml.loading.FMLPaths.CONFIGDIR.get().resolve("worldcombat-ui.json");}
    private static JsonObject values(){
        if(values==null){values=new JsonObject();if(Files.isRegularFile(file()))try{values=JsonParser.parseString(Files.readString(file())).getAsJsonObject();}catch(IOException|RuntimeException error){ClientPresentation.reportUiFailure("ui/preferences-read",error.toString());}}
        return values;
    }
    public static String read(String key){if(!key.matches("[a-z0-9_:/.-]{1,128}"))throw new IllegalArgumentException("Invalid UI preference key");var value=values().get(key);return value==null?"{}":value.toString();}
    public static void write(String key,String json){
        read(key);if(json.length()>32768)throw new IllegalArgumentException("UI preference limit exceeded");
        var next=JsonParser.parseString(json).getAsJsonObject();values().add(key,next);
        try{Files.createDirectories(file().getParent());var staging=file().resolveSibling("worldcombat-ui.json.tmp");Files.writeString(staging,new GsonBuilder().setPrettyPrinting().create().toJson(values()));Files.move(staging,file(),StandardCopyOption.REPLACE_EXISTING);}catch(IOException error){throw new IllegalStateException("Could not save UI preferences",error);}
    }
}
