'use strict';

var FLAG_SECURE_VALUE = "";
var mode = "";
var methodURL = "";
var requestHeaders = "";
var requestBody = "";
var responseHeaders = "";
var responseBody = "";


var Color = {
  RESET: "\x1b[39;49;00m", Black: "0;01", Blue: "4;01", Cyan: "6;01", Gray: "7;11", Green: "2;01", Purple: "5;01", Red: "1;01", Yellow: "3;01",
  Light: {
      Black: "0;11", Blue: "4;11", Cyan: "6;11", Gray: "7;01", Green: "2;11", Purple: "5;11", Red: "1;11", Yellow: "3;11"
  }
};

function enumerateModules(){
  
  var modules = Process.enumerateModules();
  colorLog('[+] Enumerating loaded modules:',{c: Color.Blue});

  for (var i = 0; i < modules.length; i++)
    console.log(modules[i].path + modules[i].name);

  
}


function getApplicationContext() {
	return Java.use('android.app.ActivityThread').currentApplication().getApplicationContext();
  }

function traceClass(targetClass)
{

	console.log("entering traceClass")

	var hook = Java.use(targetClass);
	var methods = hook.class.getDeclaredMethods();
	hook.$dispose();

	console.log("entering pasedMethods")

	var parsedMethods = [];
	methods.forEach(function(method) {
		try{
			parsedMethods.push(method.toString().replace(targetClass + ".", "TOKEN").match(/\sTOKEN(.*)\(/)[1]);
		}
		catch(err){}
	});

	console.log("entering traceMethods")


	var targets = uniqBy(parsedMethods, JSON.stringify);
	targets.forEach(function(targetMethod) {
		try{
			traceMethod(targetClass + "." + targetMethod);
		}
		catch(err){}
	});
}

function uniqBy(array, key)
{
        var seen = {};
        return array.filter(function(item) {
                var k = key(item);
                return seen.hasOwnProperty(k) ? false : (seen[k] = true);
        });
}

function traceMethod(targetClassMethod)
{
	var delim = targetClassMethod.lastIndexOf(".");
	if (delim === -1) return;

	var targetClass = targetClassMethod.slice(0, delim)
	var targetMethod = targetClassMethod.slice(delim + 1, targetClassMethod.length)

	var hook = Java.use(targetClass);
	var overloadCount12 = hook[targetMethod].overloads.length;

	colorLog("Tracing " + targetClassMethod + " [" + overloadCount12 + " overload(s)]",{c: Color.Green});

	for (var i = 0; i < overloadCount12; i++) {

		hook[targetMethod].overloads[i].implementation = function() {
		  colorLog("\n[ ▶︎▶︎▶︎] Entering: " + targetClassMethod,{c: Color.Purple});

			//if (arguments.length) console.log();
			for (var j = 0; j < arguments.length; j++) {
				console.log("\t\\_arg[" + j + "]: " + arguments[j]);
			}
      if (arguments.length) console.log();

			var retval = this[targetMethod].apply(this, arguments); // rare crash (Frida bug?)
			colorLog("\n[ ◀︎◀︎◀︎ ] Exiting " + targetClassMethod ,{c: Color.Purple});
      
      console.log('\t\\_Returns: '+retval+'\n');
			return retval;
		}
	}
}


var Utf8 = {
  encode : function (string) {
      string = string.replace(/\r\n/g,"\n");
      var utftext = "";
      for (var n = 0; n < string.length; n++) {
          var c = string.charCodeAt(n);
          if (c < 128) {
              utftext += String.fromCharCode(c);
          }
          else if((c > 127) && (c < 2048)) {
              utftext += String.fromCharCode((c >> 6) | 192);
              utftext += String.fromCharCode((c & 63) | 128);
          }
          else {
              utftext += String.fromCharCode((c >> 12) | 224);
              utftext += String.fromCharCode(((c >> 6) & 63) | 128);
              utftext += String.fromCharCode((c & 63) | 128);
          }
      }
      return utftext;
  },
  // publi
  decode : function (utftext) {
      var string = "";
      var i = 0;
      var c = c1 = c2 = 0;
      while ( i < utftext.length ) {
          c = utftext.charCodeAt(i);
          if (c < 128) {
              string += String.fromCharCode(c);
              i++;
          }
          else if((c > 191) && (c < 224)) {
              c2 = utftext.charCodeAt(i+1);
              string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
              i += 2;
          }
          else {
              c2 = utftext.charCodeAt(i+1);
              c3 = utftext.charCodeAt(i+2);
              string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
              i += 3;
          }
      }
      return string;
  }
}


function describeJavaClass(className) {
  var jClass = Java.use(className);
  console.log(JSON.stringify({
    _name: className,
    _methods: Object.getOwnPropertyNames(jClass.__proto__).filter(function(m) { 
      return !m.startsWith('$') // filter out Frida related special properties
        || m == 'class' || m == 'constructor' // optional
    }), 
    _fields: jClass.class.getFields().map(function(f) {
      return f.toString()
    })  
  }, null, 2));
}

var colorLog = function (input, kwargs) {
  kwargs = kwargs || {};
  var logLevel = kwargs['l'] || 'log', colorPrefix = '\x1b[3', colorSuffix = 'm';
  if (typeof input === 'object')
      input = JSON.stringify(input, null, kwargs['i'] ? 2 : null);
  if (kwargs['c'])
      input = colorPrefix + kwargs['c'] + colorSuffix + input + Color.RESET;
  console[logLevel](input);
};




var printBacktrace=function () {
  Java.perform(function() {
      var android_util_Log = Java.use('android.util.Log'), java_lang_Exception = Java.use('java.lang.Exception');
      var exc = android_util_Log.getStackTraceString(java_lang_Exception.$new());
      colorLog(exc, { c: Color.Green });
  });
};

var processArgs = function(command, envp, dir) {
    var output = {};
    if (command) {
      console.log("Command: " + command);
    //   output.command = command;
    }
    if (envp) {
      console.log("Environment: " + envp);
    //   output.envp = envp;
    }
    if (dir) {
      console.log("Working Directory: " + dir);
    //   output.dir = dir;
    }
    // return output;
  }
  

var _byteArraytoHexString = function(byteArray) {
    if (!byteArray) { return 'null'; }
    if (byteArray.map) {
      return byteArray.map(function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
      }).join('');
    } else {
      return byteArray + "";
    }
  }
  
  var updateInput = function(input) {
    if (input.length && input.length > 0) {
      var normalized = byteArraytoHexString(input);
    } else if (input.array) {
      var normalized = byteArraytoHexString(input.array());
    } else {
      var normalized = input.toString();
    }
    return normalized;
  }
  

var byteArraytoHexString = function(byteArray) {
  if (byteArray && byteArray.map) {
    return byteArray.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
  } else {
    return JSON.stringify(byteArray);
  }
}

var hexToAscii = function(input) {
  var hex = input.toString();
  var str = '';
  for (var i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

var displayString = function(input){
	var str = input.replace('[','');
	var str1 = str.replace(']','');
	var res = str1.split(',');
	var ret = '';
	for(var i = 0; i<res.length; i++){
		if(res[i] > 31 && res[i]<127)
			ret += String.fromCharCode(res[i]);
		else ret += ' ';

	}

  colorLog("[+] PARSING TO STRING: " + ret,{c:Color.Green});
  colorLog('',{c:Color.RESET});
}
var normalize = function(input) {
    if (input.length && input.length > 0) {
      var normalized = byteArraytoHexString(input);
    } else if (input.array) {
      var normalized = byteArraytoHexString(input.array());
    } else {
      var normalized = input.toString();
    }
    return normalized;
  }

var normalizeInput = function(input) {
  if (input.array) {
    var normalized = byteArraytoHexString(input.array());
  } else if (input.length && input.length > 0) {
    var normalized = byteArraytoHexString(input);
  } else {
    var normalized = JSON.stringify(input);
  }
  return normalized;
}

var getMode = function(Cipher, mode) {
  if (mode === 2) {
    mode = "DECRYPT";
  } else if (mode === 1) {
    mode = "ENCRYPT";
  }
  return mode;
}

var getRandomValue = function(arg) {
  if (!arg) { return 'null'; }
  var type = arg.toString().split('@')[0].split('.');
  type = type[type.length - 1];
  if (type === "SecureRandom") {
    if (arg.getSeed) {
      return byteArraytoHexString(arg.getSeed(10));
    }
  }
}

var normalizeKey = function(cert_or_key) {
  var type = cert_or_key.toString().split('@')[0].split('.');
  type = type[type.length - 1];
  if (type === "SecretKeySpec") {
    return byteArraytoHexString(cert_or_key.getEncoded());
  } else {
    return "non-SecretKeySpec: " + cert_or_key.toString() + ", encoded: " + byteArraytoHexString(cert_or_key.getEncoded()) + ", object: " + JSON.stringify(cert_or_key);
  }

}
var byteArrayToString = function(input){
  var buffer = Java.array('byte', input);
  var result = "";
  for(var i = 0; i < buffer.length; ++i){
      if(buffer[i] > 31 && buffer[i]<127)
        result+= (String.fromCharCode(buffer[i]));
      else result += ' ';
  
    }
  return result;
}

var byteArrayToStringE = function(input){
  var buffer = Java.array('byte', input);
  var result = "";
  var unprintable = false;
  for(var i = 0; i < buffer.length; ++i){
      if(buffer[i] > 31 && buffer[i]<127)
        result+= (String.fromCharCode(buffer[i]));
      else {
        unprintable = true;
        result = "Input cant be transformed to ascii string";
        break;
      }
  
    }
  return result;
}


  function readStreamToHex (stream) {
    var data = [];
    var byteRead = stream.read();
    while (byteRead != -1)
    {
        data.push( ('0' + (byteRead & 0xFF).toString(16)).slice(-2) );
                /* <---------------- binary to hex ---------------> */
        byteRead = stream.read();
    }
    stream.close();
    return data.join('');
}



const jni_struct_array = [
  "reserved0",
  "reserved1",
  "reserved2",
  "reserved3",
  "GetVersion",
  "DefineClass",
  "FindClass",
  "FromReflectedMethod",
  "FromReflectedField",
  "ToReflectedMethod",
  "GetSuperclass",
  "IsAssignableFrom",
  "ToReflectedField",
  "Throw",
  "ThrowNew",
  "ExceptionOccurred",
  "ExceptionDescribe",
  "ExceptionClear",
  "FatalError",
  "PushLocalFrame",
  "PopLocalFrame",
  "NewGlobalRef",
  "DeleteGlobalRef",
  "DeleteLocalRef",
  "IsSameObject",
  "NewLocalRef",
  "EnsureLocalCapacity",
  "AllocObject",
  "NewObject",
  "NewObjectV",
  "NewObjectA",
  "GetObjectClass",
  "IsInstanceOf",
  "GetMethodID",
  "CallObjectMethod",
  "CallObjectMethodV",
  "CallObjectMethodA",
  "CallBooleanMethod",
  "CallBooleanMethodV",
  "CallBooleanMethodA",
  "CallByteMethod",
  "CallByteMethodV",
  "CallByteMethodA",
  "CallCharMethod",
  "CallCharMethodV",
  "CallCharMethodA",
  "CallShortMethod",
  "CallShortMethodV",
  "CallShortMethodA",
  "CallIntMethod",
  "CallIntMethodV",
  "CallIntMethodA",
  "CallLongMethod",
  "CallLongMethodV",
  "CallLongMethodA",
  "CallFloatMethod",
  "CallFloatMethodV",
  "CallFloatMethodA",
  "CallDoubleMethod",
  "CallDoubleMethodV",
  "CallDoubleMethodA",
  "CallVoidMethod",
  "CallVoidMethodV",
  "CallVoidMethodA",
  "CallNonvirtualObjectMethod",
  "CallNonvirtualObjectMethodV",
  "CallNonvirtualObjectMethodA",
  "CallNonvirtualBooleanMethod",
  "CallNonvirtualBooleanMethodV",
  "CallNonvirtualBooleanMethodA",
  "CallNonvirtualByteMethod",
  "CallNonvirtualByteMethodV",
  "CallNonvirtualByteMethodA",
  "CallNonvirtualCharMethod",
  "CallNonvirtualCharMethodV",
  "CallNonvirtualCharMethodA",
  "CallNonvirtualShortMethod",
  "CallNonvirtualShortMethodV",
  "CallNonvirtualShortMethodA",
  "CallNonvirtualIntMethod",
  "CallNonvirtualIntMethodV",
  "CallNonvirtualIntMethodA",
  "CallNonvirtualLongMethod",
  "CallNonvirtualLongMethodV",
  "CallNonvirtualLongMethodA",
  "CallNonvirtualFloatMethod",
  "CallNonvirtualFloatMethodV",
  "CallNonvirtualFloatMethodA",
  "CallNonvirtualDoubleMethod",
  "CallNonvirtualDoubleMethodV",
  "CallNonvirtualDoubleMethodA",
  "CallNonvirtualVoidMethod",
  "CallNonvirtualVoidMethodV",
  "CallNonvirtualVoidMethodA",
  "GetFieldID",
  "GetObjectField",
  "GetBooleanField",
  "GetByteField",
  "GetCharField",
  "GetShortField",
  "GetIntField",
  "GetLongField",
  "GetFloatField",
  "GetDoubleField",
  "SetObjectField",
  "SetBooleanField",
  "SetByteField",
  "SetCharField",
  "SetShortField",
  "SetIntField",
  "SetLongField",
  "SetFloatField",
  "SetDoubleField",
  "GetStaticMethodID",
  "CallStaticObjectMethod",
  "CallStaticObjectMethodV",
  "CallStaticObjectMethodA",
  "CallStaticBooleanMethod",
  "CallStaticBooleanMethodV",
  "CallStaticBooleanMethodA",
  "CallStaticByteMethod",
  "CallStaticByteMethodV",
  "CallStaticByteMethodA",
  "CallStaticCharMethod",
  "CallStaticCharMethodV",
  "CallStaticCharMethodA",
  "CallStaticShortMethod",
  "CallStaticShortMethodV",
  "CallStaticShortMethodA",
  "CallStaticIntMethod",
  "CallStaticIntMethodV",
  "CallStaticIntMethodA",
  "CallStaticLongMethod",
  "CallStaticLongMethodV",
  "CallStaticLongMethodA",
  "CallStaticFloatMethod",
  "CallStaticFloatMethodV",
  "CallStaticFloatMethodA",
  "CallStaticDoubleMethod",
  "CallStaticDoubleMethodV",
  "CallStaticDoubleMethodA",
  "CallStaticVoidMethod",
  "CallStaticVoidMethodV",
  "CallStaticVoidMethodA",
  "GetStaticFieldID",
  "GetStaticObjectField",
  "GetStaticBooleanField",
  "GetStaticByteField",
  "GetStaticCharField",
  "GetStaticShortField",
  "GetStaticIntField",
  "GetStaticLongField",
  "GetStaticFloatField",
  "GetStaticDoubleField",
  "SetStaticObjectField",
  "SetStaticBooleanField",
  "SetStaticByteField",
  "SetStaticCharField",
  "SetStaticShortField",
  "SetStaticIntField",
  "SetStaticLongField",
  "SetStaticFloatField",
  "SetStaticDoubleField",
  "NewString",
  "GetStringLength",
  "GetStringChars",
  "ReleaseStringChars",
  "NewStringUTF",
  "GetStringUTFLength",
  "GetStringUTFChars",
  "ReleaseStringUTFChars",
  "GetArrayLength",
  "NewObjectArray",
  "GetObjectArrayElement",
  "SetObjectArrayElement",
  "NewBooleanArray",
  "NewByteArray",
  "NewCharArray",
  "NewShortArray",
  "NewIntArray",
  "NewLongArray",
  "NewFloatArray",
  "NewDoubleArray",
  "GetBooleanArrayElements",
  "GetByteArrayElements",
  "GetCharArrayElements",
  "GetShortArrayElements",
  "GetIntArrayElements",
  "GetLongArrayElements",
  "GetFloatArrayElements",
  "GetDoubleArrayElements",
  "ReleaseBooleanArrayElements",
  "ReleaseByteArrayElements",
  "ReleaseCharArrayElements",
  "ReleaseShortArrayElements",
  "ReleaseIntArrayElements",
  "ReleaseLongArrayElements",
  "ReleaseFloatArrayElements",
  "ReleaseDoubleArrayElements",
  "GetBooleanArrayRegion",
  "GetByteArrayRegion",
  "GetCharArrayRegion",
  "GetShortArrayRegion",
  "GetIntArrayRegion",
  "GetLongArrayRegion",
  "GetFloatArrayRegion",
  "GetDoubleArrayRegion",
  "SetBooleanArrayRegion",
  "SetByteArrayRegion",
  "SetCharArrayRegion",
  "SetShortArrayRegion",
  "SetIntArrayRegion",
  "SetLongArrayRegion",
  "SetFloatArrayRegion",
  "SetDoubleArrayRegion",
  "RegisterNatives",
  "UnregisterNatives",
  "MonitorEnter",
  "MonitorExit",
  "GetJavaVM",
  "GetStringRegion",
  "GetStringUTFRegion",
  "GetPrimitiveArrayCritical",
  "ReleasePrimitiveArrayCritical",
  "GetStringCritical",
  "ReleaseStringCritical",
  "NewWeakGlobalRef",
  "DeleteWeakGlobalRef",
  "ExceptionCheck",
  "NewDirectByteBuffer",
  "GetDirectBufferAddress",
  "GetDirectBufferCapacity",
  "GetObjectRefType"
]

/*
Calculate the given funcName address from the JNIEnv pointer
*/
function getJNIFunctionAdress(jnienv_addr,func_name){
  var offset = jni_struct_array.indexOf(func_name) * Process.pointerSize
  
  // console.log("offset : 0x" + offset.toString(16))
  
  return Memory.readPointer(jnienv_addr.add(offset))
}


// Hook all function to have an overview of the function called
function hook_all(jnienv_addr){
  jni_struct_array.forEach(function(func_name){
      // Calculating the address of the function
      if(!func_name.includes("reserved"))
     {
          var func_addr = getJNIFunctionAdress(jnienv_addr,func_name)
          Interceptor.attach(func_addr,{
              onEnter: function(args){
                  console.log("[+] Entered : " + func_name)
              }
          })
      }
  })
}

function inspectObject(obj) {
    const Class_X = Java.use("java.lang.Class");

    const obj_class = Java.cast(obj.getClass(), Class_X);
    const fields = obj_class.getDeclaredFields();
    const methods = obj_class.getMethods();
    console.log("Inspecting " + obj.getClass().toString());
    console.log("[+]------------------------------Fields------------------------------:");
    for (var i in fields)
        console.log("\t\t" + fields[i].toString());
    console.log("[+]------------------------------Methods-----------------------------:");
    for (var i in methods)
        console.log("\t\t" + methods[i].toString());
}


//------------------------https://github.com/CreditTone/hooker----------------------------

function classExists(className) {
  var exists = false;
  try {
      var clz = Java.use(className);
      exists = true;
  } catch(err) {
      //console.log(err);
  }
  return exists;
};

function methodInBeat(invokeId, timestamp, methodName, executor) {
var startTime = timestamp;
  var androidLogClz = Java.use("android.util.Log");
  var exceptionClz = Java.use("java.lang.Exception");
  var threadClz = Java.use("java.lang.Thread");
  var currentThread = threadClz.currentThread();
  var stackInfo = androidLogClz.getStackTraceString(exceptionClz.$new());
  var str = ("------------startFlag:" + invokeId + ",objectHash:"+executor+",thread(id:" + currentThread.getId() +",name:" + currentThread.getName() + "),timestamp:" + startTime+"---------------\n");
  str += methodName + "\n";
  str += stackInfo.substring(20);
  str += ("------------endFlag:" + invokeId + ",usedtime:" + (new Date().getTime() - startTime) +"---------------\n");
console.log(str);
};

function log(str) {
  console.log(str);
};






function tryGetClass(className) {
  var clz = undefined;
  try {
      clz = Java.use(className);
  } catch(e) {}
  return clz;
}

function newMethodBeat(text, executor) {
  var threadClz = Java.use("java.lang.Thread");
  // var androidLogClz = Java.use("android.util.Log");
  // var exceptionClz = Java.use("java.lang.Exception");
  var currentThread = threadClz.currentThread();
  var beat = new Object();
  beat.invokeId = Math.random().toString(36).slice( - 8);
  beat.executor = executor;
  beat.threadId = currentThread.getId();
  beat.threadName = currentThread.getName();
  beat.text = text;
  beat.startTime = new Date().getTime();
  //beat.stackInfo = androidLogClz.getStackTraceString(exceptionClz.$new()).substring(20);
  return beat;
};

function printBeat(beat) {
  colorLog(beat.text,{c:Color.Gray});
};

var containRegExps = new Array()

var notContainRegExps = new Array(RegExp(/\.jpg/), RegExp(/\.png/))

function check(str) {
  str = str.toString();
  if (! (str && str.match)) {
      return false;
  }
  for (var i = 0; i < containRegExps.length; i++) {
      if (!str.match(containRegExps[i])) {
          return false;
      }
  }
  for (var i = 0; i < notContainRegExps.length; i++) {
      if (str.match(notContainRegExps[i])) {
          return false;
      }
  }
  return true;
}
//------------------------https://github.com/CreditTone/hooker EOF----------------------------

function displayAppInfo(){
  var context = null
  var ActivityThread = Java.use('android.app.ActivityThread');
  var app = ActivityThread.currentApplication();

    if (app != null) {
        context = app.getApplicationContext();
        var app_classname = app.getClass().toString().split(' ')[1];

        
            var filesDirectory= context.getFilesDir().getAbsolutePath().toString();
            var cacheDirectory= context.getCacheDir().getAbsolutePath().toString();
            var externalCacheDirectory= context.getExternalCacheDir().getAbsolutePath().toString();
            var codeCacheDirectory= 'getCodeCacheDir' in context ? context.getCodeCacheDir().getAbsolutePath().toString() : 'N/A';
            var obbDir= context.getObbDir().getAbsolutePath().toString();
            var packageCodePath= context.getPackageCodePath().toString();
            var applicationName= app_classname;
           
      
        
        colorLog("\n-------------------Application Info--------------------\n",{c: Color.Green});
        colorLog("- Frida version: "+Frida.version,{c: Color.Gray});
        colorLog("- Script runtime: "+Script.runtime,{c: Color.Gray});
        colorLog("- Application Name: "+applicationName,{c: Color.Gray});
        colorLog("- Files Directory: "+filesDirectory,{c: Color.Gray});
        colorLog("- Cache Directory: "+cacheDirectory,{c: Color.Gray});
        colorLog("- External Cache Directory: "+externalCacheDirectory,{c: Color.Gray});
        colorLog("- Code Cache Directory: "+codeCacheDirectory,{c: Color.Gray});
        colorLog("- Obb Directory: "+obbDir,{c: Color.Gray});
        colorLog("- Package Code Path: "+packageCodePath,{c: Color.Gray});
        colorLog("\n-------------------EOF Application Info-----------------\n",{c: Color.Green});
        
            var info = {};
            info.applicationName = applicationName;
            info.filesDirectory = filesDirectory;
            info.cacheDirectory = cacheDirectory;
            info.externalCacheDirectory = externalCacheDirectory;
            info.codeCacheDirectory = codeCacheDirectory;
            info.obbDir = obbDir;
            info.packageCodePath = packageCodePath;
 
            send(JSON.stringify(info));
        


    } else {
        console.log("No context yet!")
    }


}


//------------------------https://github.com/CreditTone/hooker EOF----------------------------

function notifyNewSharedPreference(key, value) {
  var k = key;
  var v = value;
  Java.use('android.app.SharedPreferencesImpl$EditorImpl').putString.overload('java.lang.String', 'java.lang.String').implementation = function(k, v) {
    console.log('[SharedPreferencesImpl]', k, '=', v);
    return this.putString(k, v);
  }
}


//------------------------ch0pin----------------------------

function dumpIntent(intent, redump=true)
{
  if(intent.getStringExtra("marked_as_dumped") && redump === false)
    return;

  var bundle_clz = intent.getExtras();
  var data = intent.getData();
  var action = intent.getAction();

  colorLog(intent, {c:Color.Cyan});
  var type = null;
  if(data != null)
  {
    colorLog('\t\\_data: ', {c:Color.Cyan})
    colorLog('\t\t'+data, {c:Color.Yellow})
  }
  if(action != null)
  {
    colorLog('\t\\_action: ', {c:Color.Cyan})
    colorLog('\t\t'+action, {c:Color.Yellow})
  }

  if(bundle_clz != null)
  {
    colorLog('\t\\_Extras: ', {c:Color.Cyan})
    var keySet = bundle_clz.keySet();
    var iter = keySet.iterator();
    while(iter.hasNext()) {
      var currentKey = iter.next();
      var currentValue = bundle_clz.get(currentKey);
      if (currentValue!=null)
        type =  currentValue.getClass().toString();
      else type = 'undefined'
    
      var t = type.substring(type.lastIndexOf('.')+1,type.length)
      
      console.log( '\t\t('+t+ ') '+ currentKey + ' = ' + currentValue);
    }
  }
  intent.putExtra("marked_as_dumped","marked");
}
