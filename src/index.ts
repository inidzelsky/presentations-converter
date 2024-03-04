import * as gm from 'gm'
import { createReadStream } from 'fs'
import { mkdir, readdir } from 'fs/promises'
import { resolve as pathResolve } from 'path'
import { v4 as uuidv4 } from 'uuid'

type PageSize = {
    width: number;
    height: number;
}

type ConversionResult = {
    id: string;
    pagesSizes: PageSize[];
}

class PresentationConverter {
    private readonly imageMagick: gm.SubClass;

    constructor() {
        this.imageMagick = gm.subClass({ imageMagick: '7+' });
    }

    public async convert(input: NodeJS.ReadableStream): Promise<ConversionResult> {
        const id = uuidv4()

        const outputFolderPath = pathResolve('output', id);

        await mkdir(outputFolderPath)

        return new Promise((resolve, reject) =>
            this.imageMagick(input)
                // Will change output image resolution of its larger than given params
                // without changing aspect ratio
                .resize(1280, 720, '>')
                .write(pathResolve('output', id, 'output-%d.jpg'), (err) => {
                    if (err) {
                        reject(err)
                    }

                    resolve(undefined)
                })
        ).then(async () => {
            const pagesSizes = await this.extractPagesSizes(outputFolderPath);

            return {
                id,
                pagesSizes,
            }
        })
    }

    private async extractPagesSizes(outputFolderPath: string): Promise<PageSize[]> {
        const pagesFilenames = await readdir(outputFolderPath);

        const promises = pagesFilenames
            .map(filename => pathResolve(outputFolderPath, filename))
            .map((filename): Promise<PageSize> => new Promise(
                (resolve, reject) => this.imageMagick(filename).identify((err, imageInfo) => {
                    if (err) {
                        reject(err)
                    }

                    resolve(imageInfo.size)
                }))
            )

        return await Promise.all(promises)
    }
}

const presentationConverter = new PresentationConverter();

(async () => {
    const start = Date.now();
    const sourcePath = pathResolve('assets', 'bible.pdf');
    console.log(sourcePath);
    const sourceStream = createReadStream(sourcePath);

    const result = await presentationConverter.convert(sourceStream);

    console.log(result)

    console.log(`Duration: ${Date.now() - start} ms`)
})()
