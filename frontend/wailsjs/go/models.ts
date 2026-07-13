export namespace backend {
	
	export class MonitorFileInfo {
	    path: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new MonitorFileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.size = source["size"];
	    }
	}
	export class PathFile {
	    name: string;
	    path: string;
	    data: number[];
	
	    static createFrom(source: any = {}) {
	        return new PathFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.data = source["data"];
	    }
	}
	export class PathFileStat {
	    path: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new PathFileStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.size = source["size"];
	    }
	}
	export class ReadPathsResult {
	    files: PathFile[];
	    droppedFolderName?: string;
	    unsupportedFile?: string;
	
	    static createFrom(source: any = {}) {
	        return new ReadPathsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.files = this.convertValues(source["files"], PathFile);
	        this.droppedFolderName = source["droppedFolderName"];
	        this.unsupportedFile = source["unsupportedFile"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StartMonitorRequest {
	    folders: string[];
	    files: MonitorFileInfo[];
	
	    static createFrom(source: any = {}) {
	        return new StartMonitorRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folders = source["folders"];
	        this.files = this.convertValues(source["files"], MonitorFileInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

